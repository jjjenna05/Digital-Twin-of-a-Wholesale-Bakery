
import json
import math
from pathlib import Path
import salabim as sim
#data folder
DATA_DIR = Path(__file__).parent.parent / "data"

#error for mistake in user's confg or scenario
class ConfigError(Exception):
    pass
#read one json file and give back its data
def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)
        
#function turn clock into minutes after start clock
def clock_to_minutes(clock, start_clock):
    #blank means user did not type a time
    if clock == "" or clock is None:
        return None
    #turn clock into list, first index is hr, second is min
    parts = clock.split(":")
    start_parts = start_clock.split(":")
    #convert into minutes
    minutes = int(parts[0]) * 60 + int(parts[1])
    start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
    #start count from startclock
    result = minutes - start_minutes
    #time after midnight is the next day, so add one day
    if result < 0:
        result = result + 24 * 60
    return result

#find recipe by name in config
def find_recipe(config, name):
    #recipe key in config.json
    recipes = config["recipes"]
    for i in range(len(recipes)):
        #if recipe name matches, return
        if recipes[i]["name"] == name:
            return recipes[i]
    #None if there is no recipe
    return None

#read tonight's orders with deadline in minutes and the recipe of each item
def get_orders(config, scenario):
    #get start clock
    start_clock = scenario["startClock"]
    orders = []
    for i in range(len(scenario["orders"])):
        #get each order item
        order = scenario["orders"][i]
        #get recipe for this order item, item name is same as recipe
        recipe = find_recipe(config, order["item"])
        #stop engine if this item has no recipe in the config
        if recipe is None:
            raise ConfigError(order["item"] + " has no recipe in this configuration.")
        #build new dict for each orders
        orders.append({
            "item": order["item"],
            "priority": i + 1,
            "quantity": order["quantity"],
            "unit": order["unit"],
            "deadline": order["deadline"],
            #convert to minutes from start clock
            "deadlineMinutes": clock_to_minutes(order["deadline"], start_clock),
            #convert not before time into minutes
            "notBeforeMinutes": clock_to_minutes(order.get("notBefore", ""), start_clock),
            #copy recipe from config
            "recipe": recipe
        })
    #return all orders as dict list
    return orders

#find the row "1 [unit] = n [of]" for this unit, recipe wins if exists, then config units
def find_unit_row(config, recipe, unit):
    capacity = recipe["capacity"]
    #search in recipe's capacity first as it get first priority
    for i in range(len(capacity)):
        if capacity[i]["unit"] == unit:
            return capacity[i]
    #search in config's unit tab if not find in recipe capacity
    units = config["units"]
    for i in range(len(units)):
        #skip a units tab row with no equals provided
        if units[i]["unit"] == unit and units[i]["equals"] is not None:
            return units[i]
    return None
  
#function to find equal count of pieces in one of this unit
def pieces_per_unit(config, recipe, unit):
    pieces = 1
    visited = set()
    #loop the rows until finds Pieces, for example Racks to Trays to Pieces
    while unit != "Pieces":
        #stop engine if the unit conversion repeats
        if unit in visited:
            raise ConfigError("Circular unit conversion for " + recipe["name"] + ".")
        visited.add(unit)
        row = find_unit_row(config, recipe, unit)
        #stop the engine and raise error if no row can turn this unit into another unit
        if row is None:
            raise ConfigError("No row turns " + unit + " into Pieces for " + recipe["name"] + ".")
        #check that the conversion is positive
        if row["equals"] is None or row["equals"] <= 0:
            raise ConfigError(unit + " must have a positive conversion.")
        #multiple with equal number
        pieces = pieces * row["equals"]
        #get the unit
        unit = row["of"]
    return pieces

#find the batch size in pieces unit from recipe's Batches row
def get_batch_size(config, recipe):
    capacity = recipe["capacity"]
    for i in range(len(capacity)):
        if capacity[i]["unit"] == "Batches":
            return pieces_per_unit(config, recipe, "Batches")
    #stop engine if this recipe has no Batches row
    raise ConfigError(recipe["name"] + " has no Batches row in its Capacity.")


#convert machine capacity into Pieces using recipe capacity
def get_machine_capacity(config, recipe, equipment):
    capacity = equipment["capacity"]
    amount = capacity["amount"]
    unit = capacity["unit"]

    #stop engine if machine capacity is missing or invalid
    if amount is None or amount <= 0:
        raise ConfigError(equipment["name"] + " must have a positive capacity.")

    #convert the machine's capacity into pieces
    pieces = math.floor(amount * pieces_per_unit(config, recipe, unit))

    if pieces <= 0:
        raise ConfigError(equipment["name"] + " cannot hold one piece of " + recipe["name"] + ".")

    return pieces


#split a batch into loads that fit in the machine
def split_loads(pieces, capacity):
    loads = []

    if capacity <= 0:
        raise ConfigError("Machine capacity must be positive.")

    #make each load as large as the machine can hold
    while pieces > 0:
        load = min(pieces, capacity)
        loads.append(load)
        pieces = pieces - load

    return loads

#split a batch into individual units for one by one machines
def get_one_by_one_loads(config, recipe, equipment, pieces):
    unit = equipment["capacity"]["unit"]

    #find how many pieces fit in one unit
    unit_pieces = pieces_per_unit(config, recipe, unit)

    if unit_pieces <= 0:
        raise ConfigError(unit + " must have a positive conversion.")

    #each load is one unit instead of the whole machine capacity
    return split_loads(pieces, unit_pieces)

#turn each order into batches, for example 200 Glazed Donuts is 120 + 80, 2 batches
def make_batches(config, orders):
    batches = []
    batch_counts = {}
    for i in range(len(orders)):
        #get the order data
        order = orders[i]
        #get recipe data from config's recipe
        recipe = order["recipe"]
        #get the number of pieces in the order
        pieces = order["quantity"] * pieces_per_unit(config, recipe, order["unit"])
        #get batch size
        size = get_batch_size(config, recipe)
        #get number of batches n rounded up
        count = math.ceil(pieces / size)
        for j in range(count):
            batch_pieces = size
            #the last batch makes only what is left unless the recipe says Full batch
            if j == count - 1 and recipe["lastBatch"] != "Full batch":
                batch_pieces = pieces - size * (count - 1)
            #keep batch names unique across orders of the same item
            item = order["item"]
            batch_counts[item] = batch_counts.get(item, 0) + 1
            batches.append({
                #item name + batch number
                "name": item + " " + str(batch_counts[item]),
                "item": item,
                "pieces": batch_pieces,
                "priority": len(batches) + 1,
                #the order this batch belongs to
                "order": order["priority"],
                "notBeforeMinutes": order["notBeforeMinutes"],
                #recipe from config's recipe
                "recipe": recipe
            })
    return batches

#get the kind of a step on the steps tab
def find_kind(config, step_name):
    steps = config["steps"]
    for i in range(len(steps)):
        if steps[i]["name"] == step_name:
            return steps[i]["kind"]
    return None
    
#make one event log row
def make_row(batch, step_name, kind, start, end):
    return {
        "who": batch["name"],
        "type": "batch",
        "kind": kind,
        "batch": batch["name"],
        "step": step_name,
        "start": start,
        "end": end
    }
#the parts of one step, each part is [kind of row, minutes], the step's kind decide which time counts
def get_parts(config, batch, step, pieces=None):
    kind = find_kind(config, step["step"])
    #use the whole batch if a load quantity is not given
    if pieces is None:
        pieces = batch["pieces"]
    #find how many units the processing time applies to
    per = step.get("per", "load")
    multiplier = 1
    if per != "load":
        unit_pieces = pieces_per_unit(config, batch["recipe"], per)
        if unit_pieces <= 0:
            raise ConfigError(per + " must have a positive conversion.")
        multiplier = math.ceil(round(pieces / unit_pieces, 6))
    if kind == "Machine":
        #half the staff time is to load, then the machine time, then half the staff time is to unload
        half = step["staffTime"] * multiplier / 2
        parts = [["load", half], ["run", step["machineTime"] * multiplier], ["unload", half]]
    #if hands-on machine, machine is busy entire time
    elif kind == "Hands-on machine":
        parts = [["run", step["machineTime"] * multiplier]]
    #if by hand, worker is busy entire time
    elif kind == "By hand":
        parts = [["work", step["staffTime"] * multiplier]]
    #just entire wait time
    elif kind == "Wait":
        parts = [["wait", step["waitTime"] * multiplier]]
    else:
        #stop the engine if this step is not on the steps tab
        raise ConfigError(step["step"] + " in " + batch["recipe"]["name"] + " is not on the Steps tab.")
    return parts

#turn a time key like {"amount": 1, "unit": "hr"} into minutes, blank means 0
def time_in_minutes(time):
    if time is None or time.get("amount") is None:
        return 0
    amount = time["amount"]
    unit = time.get("unit") or "min"
    if amount < 0:
        raise ConfigError("Times cannot be negative.")
    if unit == "hr":
        return amount * 60
    if unit == "min":
        return amount
    if unit == "sec":
        return amount / 60
    raise ConfigError(unit + " is not a time unit, use hr, min or sec.")

#find the first "One by one" machine tonight that can do this step, None if there is none
def find_one_by_one(machines, step_name):
    for i in range(len(machines)):
        if step_name in machines[i]["canDo"] and machines[i]["loads"] == "One by one":
            return machines[i]
    return None

#make one machine warm-up row
def make_warmup_row(machine, start, end):
    return {
        "who": machine["name"],
        "type": "machine",
        "kind": "warmup",
        "batch": "",
        "step": "",
        "start": start,
        "end": end
    }

#find how many of this machine are on tonight's equipment list, 0 if it is not there
def find_count(scenario, name):
    tonight = scenario["equipment"]
    for i in range(len(tonight)):
        if tonight[i]["name"] == name:
            return tonight[i]["count"]
    return 0
#make tonight's machines in the Equipment list order, the list order is the bakery's first choice
def make_machines(config, scenario):
    machines = []
    equipment = config["equipment"]
    for i in range(len(equipment)):
        count = find_count(scenario, equipment[i]["name"])
        #a count of 2 should make 2 machines
        for j in range(count):
            name = equipment[i]["name"]
            #number the machines only when there is more than one
            if count > 1:
                #format Oven A 1 and Oven A 2
                name = name + " " + str(j + 1)

            #make individual spaces for one by one machines
            slots = []
            if equipment[i]["loads"] == "One by one":
                amount = equipment[i]["capacity"]["amount"]
                if (
                    not isinstance(amount, (int, float))
                    or isinstance(amount, bool)
                    or amount <= 0
                    or amount % 1 != 0
                ):
                    raise ConfigError(name + " must have a positive whole number capacity.")
                for k in range(int(amount)):
                    slot_name = name + " slot " + str(k + 1)
                    slots.append(sim.Resource(slot_name))
            #how many people a recipe switch keeps busy, blank means the machine switches alone
            switched_by = equipment[i].get("switchedBy") or 0
            if switched_by < 0:
                raise ConfigError(name + " cannot be switched by fewer than 0 workers.")
            machines.append({
                "name": name,
                "canDo": equipment[i]["canDo"],
                "capacity": equipment[i]["capacity"],
                "loads": equipment[i]["loads"],
                "slots": slots,
                #a resource for the entire machine
                "resource": sim.Resource(name),
                #minutes to change from one recipe to another
                "switchTime": time_in_minutes(equipment[i].get("switchTime")),
                "switchedBy": switched_by,
                #minutes to warm up before the first load of the night
                "warmUpTime": time_in_minutes(equipment[i].get("warmUpTime")),
                "turnOn": equipment[i].get("turnOn"),
                #minute the warm-up ends, None until the warm-up starts
                "warmUntil": None,
                #recipe of the last batch the machine ran, None before the first batch
                "lastRecipe": None
            })
    #return entire machine dict list
    return machines

#make tonight's workers from the staff list
def make_workers(config, scenario):
    workers = []
    staff = scenario["staff"]
    roles = config["roles"]
    start_clock = scenario["startClock"]
    role_counts = {}
    for i in range(len(staff)):
        role = staff[i]["role"]
        can_do = None
        #find the steps this role can do
        for j in range(len(roles)):
            if roles[j]["name"] == role:
                can_do = roles[j]["canDo"]
                break
        #stop engine if the role is not in config
        if can_do is None:
            raise ConfigError(role + " is not on the Roles tab.")
        #convert shift times into simulation minutes
        shift_start = clock_to_minutes(staff[i]["shiftStart"], start_clock)
        shift_end = clock_to_minutes(staff[i]["shiftEnd"], start_clock)

        if shift_start is None or shift_end is None:
            raise ConfigError(role + " must have a shift start and end.")

        if shift_end == shift_start:
            raise ConfigError(role + " must have different shift start and end times.")

        if shift_end < shift_start:
            shift_end = shift_end + 24 * 60
        #create each worker separately
        for j in range(staff[i]["count"]):
            role_counts[role] = role_counts.get(role, 0) + 1
            name = role + " " + str(role_counts[role])

            workers.append({
                "name": name,
                "role": role,
                "canDo": can_do,
                "shiftStart": shift_start,
                "shiftEnd": shift_end,
                "busyUntil": 0,
                "resource": sim.Resource(name)
            })
    return workers

#one batch, or one part of a batch, acts over time on sim clock
#a batch starts as one part with all its pieces, then can break into parts (for example one part per rack)
#each part moves to its next step by itself, and parts join back together when a step needs the whole batch
class Batch(sim.Component):
    #setup runs once when the batch or part is made n it keep what the part needs
    def setup(self, config, batch, rows, machines, workers, shared=None,
              pieces=None, step_index=0, unit_part=False):
        self.config = config
        self.batch = batch
        self.rows = rows
        self.machines = machines
        self.workers = workers
        #things every batch shares tonight, like the batches waiting at each machine step
        self.shared = shared
        #a new batch starts as one part with all its pieces
        if pieces is None:
            pieces = batch["pieces"]
        self.pieces = pieces
        #the step this part starts at
        self.step_index = step_index
        #True when this part is already one unit (for example one rack) of the step it starts at
        self.unit_part = unit_part
    #wait for a free machine or machine space that can do this step
    def get_machine(self, step_name):
        can_use = []
        resources = []
        for i in range(len(self.machines)):
            machine = self.machines[i]
            if step_name in machine["canDo"]:
                #one by one machines have individual spaces
                if machine["loads"] == "One by one":
                    for j in range(len(machine["slots"])):
                        resource = machine["slots"][j]
                        can_use.append([machine, resource])
                        resources.append(resource)
                else:
                    #when full machines use the entire machine
                    resource = machine["resource"]
                    can_use.append([machine, resource])
                    resources.append(resource)
        #stop engine if no machine tonight can do this step
        if len(can_use) == 0:
            raise ConfigError("No machine tonight can do " + step_name + ".")
        start = self.env.now()
        self.request(
            *resources,
            oneof=True,
            request_priority=self.batch["priority"]
        )
        #record waiting for a machine or space
        if self.env.now() > start:
            row = make_row(
                self.batch, step_name, "waiting", start, self.env.now()
            )
            row["for"] = "a machine"
            self.rows.append(row)
        #return the machine and the resource that was claimed
        for i in range(len(can_use)):
            if self.isclaiming(can_use[i][1]):
                return can_use[i][0], can_use[i][1]
    #find the workers that can do the step, each with the minute they are free
    def free_workers(self, step_name, duration):
        now = self.env.now()
        can_use = []
        #find workers that can do the step and have enough shift time
        for i in range(len(self.workers)):
            worker = self.workers[i]
            if step_name in worker["canDo"]:
                available = max(now, worker["shiftStart"], worker["busyUntil"])
                if available + duration <= worker["shiftEnd"]:
                    can_use.append([available, worker])
        #find the workers that become available first
        can_use.sort(key=lambda x: x[0])
        return can_use
    #wait for enough workers that can do this step
    #priority decides who goes first when people are free at the same minute, lower goes first
    def get_workers(self, step_name, count, duration, priority=None):
        start = self.env.now()
        if priority is None:
            priority = self.batch["priority"]
        #a step that needs staff must have at least one worker
        if count < 1:
            raise ConfigError(step_name + " must have at least one worker.")
        #check worker availability in order priority
        self.hold(0, priority=priority)
        while True:
            now = self.env.now()
            can_use = self.free_workers(step_name, duration)
            #stop engine if not enough workers can do the step
            if len(can_use) < count:
                raise ConfigError("Not enough workers can do " + step_name + " within their shifts.")
            ready_time = can_use[count - 1][0]
            #wait until enough workers are available
            if ready_time > now:
                self.hold(ready_time - now, priority=priority)
                continue
            assigned = []
            resources = []
            #reserve all workers needed for this step
            for i in range(count):
                worker = can_use[i][1]
                worker["busyUntil"] = now + duration
                assigned.append(worker)
                resources.append(worker["resource"])
            #request all the selected workers together
            self.request(*resources, oneof=False, request_priority=priority)
            #record how long the batch waited for workers
            if self.env.now() > start:
                row = make_row(self.batch, step_name, "waiting", start, self.env.now())
                row["for"] = "a worker"
                self.rows.append(row)
            return assigned

    #run the parts of one load or step
    #workers can be given when a part of a batch uses fewer people than the step's Workers box
    #others are the names of other batches whose pieces share this load
    def process_parts(self, step, kind, parts, machine, workers=None, others=None):
        #each part must start when the last part ends
        for j in range(len(parts)):
            part_kind = parts[j][0]
            duration = parts[j][1]
            if duration == 0:
                continue
            assigned = []
            #Machine needs workers only for load and unload
            #Hands-on machine and By hand need workers the whole time
            needs_workers = (
                (kind == "Machine" and part_kind in ["load", "unload"])
                or kind == "Hands-on machine"
                or kind == "By hand"
            )
            if needs_workers:
                count = workers
                if count is None:
                    count = step.get("workers") or 1
                #a finished machine is emptied before anyone starts a new load
                priority = None
                if part_kind == "unload":
                    priority = self.batch["priority"] / (self.batch["priority"]+1)
                assigned = self.get_workers(
                    step["step"], count, duration, priority
                )
            start = self.env.now()
            #give back a row for each worker
            for k in range(len(assigned)):
                row = make_row(self.batch, step["step"], part_kind, start, start + duration)
                row["who"] = assigned[k]["name"]
                row["type"] = "worker"
                self.rows.append(row)
            #give back machine or batch rows
            if machine is not None or not needs_workers:
                row = make_row(self.batch, step["step"], part_kind, start, start + duration)
                if machine is not None:
                    row["who"] = machine["name"]
                    row["type"] = "machine"
                    #list every batch in a shared load
                    if others:
                        row["batches"] = [self.batch["name"]] + others
                self.rows.append(row)
            #hold pauses this batch for the part's minutes
            self.hold(duration)
            #release the workers after their part is done
            for k in range(len(assigned)):
                self.release(assigned[k]["resource"])

    #a machine warms up before its first load of the night, the batch waits for it
    def warm_up(self, machine, step_name):
        if machine["warmUpTime"] <= 0:
            return
        #"When first needed" starts the warm-up when the first batch arrives
        if machine["warmUntil"] is None:
            now = self.env.now()
            machine["warmUntil"] = now + machine["warmUpTime"]
            self.rows.append(make_warmup_row(machine, now, machine["warmUntil"]))
        #nobody is busy during a warm-up, only the batch waits
        if machine["warmUntil"] > self.env.now():
            start = self.env.now()
            self.hold(machine["warmUntil"] - start)
            row = make_row(self.batch, step_name, "waiting", start, self.env.now())
            row["for"] = "warm-up"
            self.rows.append(row)

    #make one copy of this part for each whole unit (for example one per rack), the last one can be smaller
    def split(self, step_index, unit):
        sizes = split_loads(self.pieces, pieces_per_unit(self.config, self.batch["recipe"], unit))
        for i in range(len(sizes)):
            Batch(config=self.config, batch=self.batch, rows=self.rows,
                  machines=self.machines, workers=self.workers, shared=self.shared,
                  pieces=sizes[i], step_index=step_index, unit_part=True)

    #wait for the whole batch at this step, only the last part to arrive goes on with every piece
    def gather(self, step_index):
        gathered = self.batch["gathered"]
        gathered[step_index] = gathered.get(step_index, 0) + self.pieces
        if gathered[step_index] < self.batch["pieces"]:
            return False
        self.pieces = self.batch["pieces"]
        return True

    #give this part's pieces to the batch's machine job for this step, then wait until they are all done
    def join_job(self, step_index):
        key = self.batch["name"] + " " + str(step_index)
        jobs = self.shared["jobs"]
        if key not in jobs:
            jobs[key] = MachineJob(config=self.config, batch=self.batch, rows=self.rows,
                                   machines=self.machines, workers=self.workers,
                                   shared=self.shared, step_index=step_index)
            #batches of the same recipe at the same step can share loads
            same_step = self.batch["recipe"]["name"] + " " + str(step_index)
            self.shared["sameStep"].setdefault(same_step, []).append(jobs[key])
        job = jobs[key]
        #free is not in a load yet, left is not done yet
        entry = {"part": self, "free": self.pieces, "left": self.pieces}
        job.entries.append(entry)
        job.arrived = job.arrived + self.pieces
        if job.ispassive():
            job.activate()
        while entry["left"] > 0:
            self.passivate()

    #run one unit of this part in a one by one machine space
    def run_one_by_one(self, step, kind):
        machine, resource = self.get_machine(step["step"])
        self.warm_up(machine, step["step"])
        parts = get_parts(self.config, self.batch, step, self.pieces)
        self.process_parts(step, kind, parts, machine)
        machine["lastRecipe"] = self.batch["recipe"]["name"]
        self.release(resource)

    #process is what the batch or part does on the simulation clock
    def process(self):
        #wait until the order can start
        not_before = self.batch["notBeforeMinutes"]
        if not_before is not None and not_before > self.env.now():
            self.hold(not_before - self.env.now())
        steps = self.batch["recipe"]["steps"]
        i = self.step_index
        while i < len(steps):
            step = steps[i]
            kind = find_kind(self.config, step["step"])
            per = step.get("per") or "load"
            if kind == "Machine" or kind == "Hands-on machine":
                one_by_one = find_one_by_one(self.machines, step["step"])
                #a person works a Hands-on machine on the whole batch
                if kind == "Hands-on machine":
                    if not self.gather(i):
                        return
                    self.join_job(i)
                elif one_by_one is not None:
                    #break into one part per whole unit, each part takes its own space
                    if not self.unit_part:
                        self.split(i, one_by_one["capacity"]["unit"])
                        return
                    self.run_one_by_one(step, kind)
                else:
                    #a "When full" machine runs full loads for the batch
                    self.join_job(i)
            elif kind == "By hand":
                if per == "load":
                    #a person does one job on all of the batch
                    if not self.gather(i):
                        return
                    parts = get_parts(self.config, self.batch, step, self.pieces)
                    self.process_parts(step, kind, parts, None)
                else:
                    #break into one part per unit, each part is done by itself
                    if not self.unit_part:
                        self.split(i, per)
                        return
                    #a batch never gets more people than its Workers box says, even in many parts
                    key = self.batch["name"] + " " + str(i)
                    limits = self.shared["peopleLimits"]
                    if key not in limits:
                        limits[key] = sim.Resource(key, capacity=step.get("workers") or 1)
                    self.request(limits[key], request_priority=self.batch["priority"])
                    parts = get_parts(self.config, self.batch, step, self.pieces)
                    self.process_parts(step, kind, parts, None, workers=1)
                    self.release(limits[key])
            elif kind == "Wait":
                #a Wait step set to per unit breaks into one part per unit
                if per != "load" and not self.unit_part:
                    self.split(i, per)
                    return
                #each part counts its own time from when it arrives
                parts = get_parts(self.config, self.batch, step, self.pieces)
                self.process_parts(step, kind, parts, None)
            else:
                #stop the engine if this step is not on the steps tab
                raise ConfigError(step["step"] + " in " + self.batch["recipe"]["name"] + " is not on the Steps tab.")
            self.unit_part = False
            i = i + 1
        #the batch is ready when its last part is done
        self.batch["donePieces"] = self.batch["donePieces"] + self.pieces
        if self.batch["donePieces"] >= self.batch["pieces"]:
            self.batch["ready"] = self.env.now()

#one batch's loads at one "When full" machine step
#it keeps one machine until the batch's last load is out, and a load starts on a full load or the batch's last piece
class MachineJob(Batch):
    def setup(self, config, batch, rows, machines, workers, shared, step_index):
        super().setup(config, batch, rows, machines, workers, shared, step_index=step_index)
        #each entry is one part waiting here: {"part", "free", "left"}
        self.entries = []
        #pieces of this batch that have arrived at this step
        self.arrived = 0
    #pieces of this batch waiting here that are not in a load yet
    def own_free(self):
        return sum(entry["free"] for entry in self.entries)
    #True when every piece of this batch has arrived and is in a load
    def all_loaded(self):
        return self.arrived >= self.batch["pieces"] and self.own_free() == 0
    #take waiting pieces for one load, this batch's parts first, then other batches of the same recipe
    def take_load(self, capacity):
        load = []
        room = capacity
        for entry in self.entries:
            take = min(entry["free"], room)
            if take > 0:
                entry["free"] = entry["free"] - take
                room = room - take
                load.append([entry, take])
        others = []
        #batches never share at the step that makes the batch itself, for example Mix
        if self.step_index > 0 and room > 0:
            same_step = self.batch["recipe"]["name"] + " " + str(self.step_index)
            jobs = self.shared["sameStep"].get(same_step, [])
            #other batches go in the orders list order
            jobs = sorted(jobs, key=lambda job: job.batch["priority"])
            for job in jobs:
                if job is self or room <= 0:
                    continue
                took = False
                for entry in job.entries:
                    take = min(entry["free"], room)
                    if take > 0:
                        entry["free"] = entry["free"] - take
                        room = room - take
                        load.append([entry, take])
                        took = True
                if took:
                    others.append(job.batch["name"])
                    #let the other batch check if it still has pieces to load
                    if job.ispassive():
                        job.activate()
        return load, others
    #a machine changing to a different recipe waits its switch time first
    #give back False when the people for the switch are busy, so the machine was let go
    def switch(self, machine, resource, step):
        recipe = self.batch["recipe"]["name"]
        last = machine["lastRecipe"]
        #the first batch of the night and batches of the same recipe never switch
        if last is None or last == recipe or machine["switchTime"] <= 0:
            return True
        minutes = machine["switchTime"]
        count = machine["switchedBy"]
        assigned = []
        if count > 0:
            can_use = self.free_workers(step["step"], minutes)
            if len(can_use) < count:
                raise ConfigError("Not enough workers can switch " + machine["name"] + " within their shifts.")
            ready_time = can_use[count - 1][0]
            #until the people are free, the machine is not kept for this batch
            if ready_time > self.env.now():
                self.release(resource)
                start = self.env.now()
                self.hold(ready_time - start, priority=self.batch["priority"])
                row = make_row(self.batch, step["step"], "waiting", start, self.env.now())
                row["for"] = "a worker"
                self.rows.append(row)
                return False
            assigned = self.get_workers(step["step"], count, minutes)
        start = self.env.now()
        #a machine row for the switch and a worker row for each person it keeps busy
        row = make_row(self.batch, step["step"], "switch", start, start + minutes)
        row["who"] = machine["name"]
        row["type"] = "machine"
        self.rows.append(row)
        for k in range(len(assigned)):
            row = make_row(self.batch, step["step"], "switch", start, start + minutes)
            row["who"] = assigned[k]["name"]
            row["type"] = "worker"
            self.rows.append(row)
        self.hold(minutes)
        for k in range(len(assigned)):
            self.release(assigned[k]["resource"])
        machine["lastRecipe"] = recipe
        return True
    def process(self):
        step = self.batch["recipe"]["steps"][self.step_index]
        kind = find_kind(self.config, step["step"])
        while True:
            #a batch takes the first free machine in the equipment list
            machine, resource = self.get_machine(step["step"])
            #other batches may have already loaded all of this batch's pieces
            if self.all_loaded():
                self.release(resource)
                return
            if self.switch(machine, resource, step):
                break
        self.warm_up(machine, step["step"])
        capacity = get_machine_capacity(self.config, self.batch["recipe"], machine)
        while not self.all_loaded():
            #wait for a full load or for the batch's last piece
            start = self.env.now()
            while not self.all_loaded():
                free = self.own_free()
                if free >= capacity or (self.arrived >= self.batch["pieces"] and free > 0):
                    break
                self.passivate()
            if self.env.now() > start:
                row = make_row(self.batch, step["step"], "waiting", start, self.env.now())
                row["for"] = "a full load"
                self.rows.append(row)
            load, others = self.take_load(capacity)
            if len(load) == 0:
                break
            pieces = sum(item[1] for item in load)
            parts = get_parts(self.config, self.batch, step, pieces)
            self.process_parts(step, kind, parts, machine, others=others)
            machine["lastRecipe"] = self.batch["recipe"]["name"]
            #parts move on as soon as all their own pieces are done
            for item in load:
                entry = item[0]
                entry["left"] = entry["left"] - item[1]
                if entry["left"] <= 0 and entry["part"].ispassive():
                    entry["part"].activate()
        #let the machine go after the batch's last load is out
        self.release(resource)

#make the summary of tonight's simulation
def make_summary(orders, batches, workers, rows):
    summary_orders = []
    finish = 0
    for i in range(len(orders)):
        order = orders[i]
        #find all batches that belong to this order
        order_batches = [
            batch for batch in batches
            if batch["order"] == order["priority"]
        ]
        #check that the order has batches
        if len(order_batches) == 0:
            raise ConfigError(order["item"] + " has no batches.")
        #check that every batch finished
        for batch in order_batches:
            if "ready" not in batch:
                raise ConfigError(batch["name"] + " did not finish.")
        #the order is ready when its last batch finishes
        ready = max(batch["ready"] for batch in order_batches)
        deadline = order["deadlineMinutes"]
        #check if the order finished on time
        if deadline is None:
            status = "No deadline"
            late_by = 0
        elif ready <= deadline:
            status = "On time"
            late_by = 0
        else:
            status = "Late"
            late_by = ready - deadline
        summary_orders.append({
            "item": order["item"],
            "recipe": order["recipe"]["name"],
            "quantity": order["quantity"],
            "unit": order["unit"],
            "deadline": order["deadline"],
            "deadlineMinutes": deadline,
            "batches": len(order_batches),
            "ready": ready,
            "status": status,
            "lateBy": late_by
        })
        #find when the entire night finishes
        finish = max(finish, ready)
    #each person's working, waiting and break minutes while on shift tonight
    summary_staff = []
    for i in range(len(workers)):
        worker = workers[i]
        #add up the minutes of this person's worker rows
        working = 0
        for j in range(len(rows)):
            if rows[j]["type"] == "worker" and rows[j]["who"] == worker["name"]:
                working = working + rows[j]["end"] - rows[j]["start"]
        #minutes on shift from the shift start until the night finishes
        on_shift = max(0, min(worker["shiftEnd"], finish) - worker["shiftStart"])
        #no breaks in the engine yet
        on_break = 0
        summary_staff.append({
            "who": worker["name"],
            "working": working,
            "waiting": on_shift - working - on_break,
            "onBreak": on_break
        })
    return {
        "finish": finish,
        "orders": summary_orders,
        "staff": summary_staff
    }

#run the night and give back the event log and summary
def run_night(config, scenario, include_summary=False):
    orders = get_orders(config, scenario)
    batches = make_batches(config, orders)
    rows = []
    #a new simulation clock n it starts at minute 0
    env = sim.Environment()
    #make tonight machines after the clock
    machines = make_machines(config, scenario)
    #make tonight workers after the clock
    workers = make_workers(config, scenario)
    #machines set to "At shift start" start warming up at minute 0
    for i in range(len(machines)):
        machine = machines[i]
        if machine["warmUpTime"] > 0 and machine["turnOn"] != "When first needed":
            machine["warmUntil"] = machine["warmUpTime"]
            rows.append(make_warmup_row(machine, 0, machine["warmUntil"]))
    #things every batch shares tonight
    shared = {
        #each batch's machine job at each "When full" step
        "jobs": {},
        #jobs of the same recipe at the same step, so they can share loads
        "sameStep": {},
        #how many people a batch in many parts can use at one step
        "peopleLimits": {}
    }
    #setup every batch into schedule
    for i in range(len(batches)):
        #pieces waiting to join back together at each step
        batches[i]["gathered"] = {}
        #pieces that finished every step
        batches[i]["donePieces"] = 0
        Batch(config=config, batch=batches[i], rows=rows,
              machines=machines, workers=workers, shared=shared)
    #move the clock until there isnt any batch left to do
    env.run()
    if include_summary:
        return {
            "scenario": scenario["name"],
            "startClock": scenario["startClock"],
            "rows": rows,
            "summary": make_summary(orders, batches, workers, rows)
        }
    return rows

#test run
if __name__ == "__main__":
    config = load_json(DATA_DIR / "config.sample.json")
    scenario = load_json(DATA_DIR / "scenario.sample.json")
    rows = run_night(config, scenario)
    for i in range(len(rows)):
        print(rows[i]["batch"], rows[i]["step"], rows[i]["kind"], rows[i]["start"], rows[i]["end"], rows[i]["who"])