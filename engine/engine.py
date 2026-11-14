import json
import math
#import path from path library
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
    #loop the rows until finds Pieces, for example Racks to Trays to Pieces
    while unit != "Pieces":
        row = find_unit_row(config, recipe, unit)
        #stop the engine and raise error if no row can turn this unit into another unit
        if row is None:
            raise ConfigError("No row turns " + unit + " into Pieces for " + recipe["name"] + ".")
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
                batch_pieces = pieces - size *(count - 1)
            batches.append({
                #item name + batch number
                "name": order["item"] + " " + str(j + 1),
                "item": order["item"],
                "pieces": batch_pieces,
                "priority": order["priority"],
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
        multiplier = pieces / unit_pieces
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
            machines.append({
                "name": name,
                "canDo": equipment[i]["canDo"],
                "capacity": equipment[i]["capacity"],
                "loads": equipment[i]["loads"],
                "slots": slots,
                #a resource for the entire machine
                "resource": sim.Resource(name)
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


#one batch acts over time on sim clock
class Batch(sim.Component):
    #setup runs once when the batch is made n it keep what the batch needs
    def setup(self, config, batch, rows, machines, workers):
        self.config = config
        self.batch = batch
        self.rows = rows
        self.machines = machines
        self.workers = workers
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

    #wait for enough workers that can do this step
    def get_workers(self, step_name, count, duration):
        start = self.env.now()

        #a step that needs staff must have at least one worker
        if count < 1:
            raise ConfigError(step_name + " must have at least one worker.")

        #check worker availability in order priority
        self.hold(0, priority=self.batch["priority"])

        while True:
            now = self.env.now()
            can_use = []

            #find workers that can do the step and have enough shift time
            for i in range(len(self.workers)):
                worker = self.workers[i]

                if step_name in worker["canDo"]:
                    available = max(now, worker["shiftStart"], worker["busyUntil"])

                    if available + duration <= worker["shiftEnd"]:
                        can_use.append([available, worker])

            #stop engine if not enough workers can do the step
            if len(can_use) < count:
                raise ConfigError("Not enough workers can do " + step_name + " within their shifts.")

            #find the workers that become available first
            can_use.sort(key=lambda x: x[0])
            ready_time = can_use[count - 1][0]

            #wait until enough workers are available
            if ready_time > now:
                self.hold(ready_time - now, priority=self.batch["priority"])
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
            self.request(*resources, oneof=False, request_priority=self.batch["priority"])

            #record how long the batch waited for workers
            if self.env.now() > start:
                row = make_row(self.batch, step_name, "waiting", start, self.env.now())
                row["for"] = "a worker"
                self.rows.append(row)

            return assigned

            
    #run the parts of one load or step
    def process_parts(self, step, kind, parts, machine):
        #each part must start when the last part ends
        for j in range(len(parts)):
            part_kind = parts[j][0]
            duration = parts[j][1]
            assigned = []

            #Machine needs workers only for load and unload
            #Hands-on machine and By hand need workers the whole time
            needs_workers = (
                (kind == "Machine" and part_kind in ["load", "unload"])
                or kind == "Hands-on machine"
                or kind == "By hand"
            )

            if needs_workers:
                assigned = self.get_workers(
                    step["step"], step["workers"], duration
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

                self.rows.append(row)

            #hold pauses this batch for the part's minutes
            self.hold(duration)

            #release the workers after their part is done
            for k in range(len(assigned)):
                self.release(assigned[k]["resource"])


    #process loads that can use individual machine spaces
    def process_individual_loads(self, step, kind):
        remaining = self.batch["pieces"]
        active_loads = []
        while remaining > 0:
            #create a separate simulation component for each load
            load = MachineLoad(
                parent_batch=self,
                step=step,
                kind=kind,
                remaining=remaining
            )
            active_loads.append(load)
            #wait until the load gets a machine or space
            while load.assigned_pieces is None:
                self.passivate()
            #remove the pieces assigned to this load
            remaining = remaining - load.assigned_pieces
            #when full machines process one load at a time
            if load.loading_mode != "One by one":
                while not load.load_finished:
                    self.passivate()
        #wait until all loads finish before the next recipe step
        while any(not load.load_finished for load in active_loads):
            self.passivate()

    #process is what the batch does on the simulation clock
    def process(self):
        #wait until the order can start
        not_before = self.batch["notBeforeMinutes"]
        if not_before is not None and not_before > self.env.now():
            self.hold(not_before - self.env.now())
        steps = self.batch["recipe"]["steps"]
        for i in range(len(steps)):
            step = steps[i]
            kind = find_kind(self.config, step["step"])
            #only Machine and Hands-on machine steps use a machine
            if kind == "Machine" or kind == "Hands-on machine":
                #check if this step can use a one by one machine
                individual = any(
                    step["step"] in machine["canDo"]
                    and machine["loads"] == "One by one"
                    for machine in self.machines
                )
                if individual:
                    self.process_individual_loads(step, kind)
                else:
                    remaining = self.batch["pieces"]
                    #run as many loads as needed for the batch
                    while remaining > 0:
                        machine, resource = self.get_machine(step["step"])
                        capacity = get_machine_capacity(
                            self.config, self.batch["recipe"], machine
                        )
                        load = min(remaining, capacity)
                        parts = get_parts(
                            self.config, self.batch, step, load
                        )
                        self.process_parts(step, kind, parts, machine)
                        #release the machine after the load is done
                        self.release(resource)
                        remaining = remaining - load
            else:
                #By hand and Wait steps do not need a machine
                parts = get_parts(self.config, self.batch, step)
                self.process_parts(step, kind, parts, None)


#one machine load acts independently on the simulation clock
class MachineLoad(Batch):
    def setup(self, parent_batch, step, kind, remaining):
        #use the same configuration, rows, machines and workers
        super().setup(
            parent_batch.config,
            parent_batch.batch,
            parent_batch.rows,
            parent_batch.machines,
            parent_batch.workers
        )
        self.parent_batch = parent_batch
        self.step = step
        self.kind = kind
        self.remaining = remaining
        self.assigned_pieces = None
        self.loading_mode = None
        self.load_finished = False
    def process(self):
        #get a machine or an individual machine space
        machine, resource = self.get_machine(self.step["step"])
        self.loading_mode = machine["loads"]
        if self.loading_mode == "One by one":
            #take only one individual unit
            loads = get_one_by_one_loads(
                self.config,
                self.batch["recipe"],
                machine,
                self.remaining
            )
            self.assigned_pieces = loads[0]
        else:
            #take as many pieces as the whole machine can hold
            capacity = get_machine_capacity(
                self.config, self.batch["recipe"], machine
            )
            self.assigned_pieces = min(self.remaining, capacity)
        #let the parent batch schedule another load
        if self.parent_batch.ispassive():
            self.parent_batch.activate()
        #process this load using the recipe's configured times
        parts = get_parts(
            self.config,
            self.batch,
            self.step,
            self.assigned_pieces
        )
        self.process_parts(self.step, self.kind, parts, machine)
        #release only the resource used by this load
        self.release(resource)
        self.load_finished = True
        #notify the parent batch that this load finished
        if self.parent_batch.ispassive():
            self.parent_batch.activate()
            

#run the night and give back every row of the event log
def run_night(config, scenario):
    orders = get_orders(config, scenario)
    batches = make_batches(config, orders)
    rows = []
    #a new simulation clock n it starts at minute 0
    env = sim.Environment()
    #make tonight machines after the clock
    machines = make_machines(config, scenario)
    #make tonight workers after the clock
    workers = make_workers(config, scenario)
    #setup every batch into schedule, each one must start its process at minute 0
    for i in range(len(batches)):
        Batch(config=config, batch=batches[i], rows=rows, machines=machines, workers=workers)
    #move the clock until there isnt any batch left to do
    env.run()
    return rows

#test run
if __name__ == "__main__":
    config = load_json(DATA_DIR / "config.sample.json")
    scenario = load_json(DATA_DIR / "scenario.sample.json")
    rows = run_night(config, scenario)
    for i in range(len(rows)):
        print(rows[i]["batch"], rows[i]["step"], rows[i]["kind"], rows[i]["start"], rows[i]["end"], rows[i]["who"])