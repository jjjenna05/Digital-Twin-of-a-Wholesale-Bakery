
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
    #check that both clock times are valid
    for value in [clock, start_clock]:
        if not isinstance(value, str):
            raise ConfigError("Clock time must use HH:MM.")
        parts = value.split(":")
        if (len(parts) != 2
                or not all(part.isdigit() for part in parts)
                or not 0 <= int(parts[0]) <= 23
                or not 0 <= int(parts[1]) <= 59):
            raise ConfigError("Invalid clock time: " + value)
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
#check the worker settings and machine time overrides for recipe steps
def validate_step_settings(config):
    equipment = {machine["name"]: machine for machine in config["equipment"]}
    for recipe in config["recipes"]:
        for step in recipe["steps"]:
            kind = find_kind(config, step["step"])
            #check that the step has a recognized kind
            if kind not in ["Machine", "Hands-on machine", "By hand", "Wait"]:
                raise ConfigError(step["step"] + " has an invalid step kind.")
            #check the time fields used by this kind of step
            time_fields = {
                "Machine": ["staffTime", "machineTime"],
                "Hands-on machine": ["machineTime"],
                "By hand": ["staffTime"],
                "Wait": ["waitTime"]
            }
            for field in time_fields[kind]:
                minutes = step.get(field)
                if (not isinstance(minutes, (int, float))
                        or isinstance(minutes, bool)
                        or not math.isfinite(minutes)
                        or minutes < 0):
                    raise ConfigError(
                        step["step"] + " has an invalid " + field + "."
                    )
            if kind in ["By hand", "Machine", "Hands-on machine"]:
                worker_limits(step)
            if kind in ["By hand", "Hands-on machine"]:
                can_stop(step, kind)
            for override in step.get("machines") or []:
                name = override.get("machine")
                if name not in equipment or step["step"] not in equipment[name]["canDo"]:
                    raise ConfigError(str(name) + " cannot do " + step["step"] + ".")
                minutes = override.get("machineTime")
                if (not isinstance(minutes, (int, float)) or isinstance(minutes, bool)
                        or not math.isfinite(minutes) or minutes < 0):
                    raise ConfigError(str(name) + " must have a valid machine time.")
#find the minimum and maximum number of workers for a step
def worker_limits(step):
    minimum = step.get("workers")
    if minimum is None or minimum == "":
        minimum = 1
    maximum = step.get("upTo")
    if maximum is None or maximum == "":
        maximum = minimum
    if (not isinstance(minimum, int) or isinstance(minimum, bool)
            or minimum < 1):
        raise ConfigError(step["step"] + " must have at least one worker.")
    if (not isinstance(maximum, int) or isinstance(maximum, bool)
            or maximum < minimum):
        raise ConfigError(step["step"] + " upTo cannot be less than Workers.")
    return minimum, maximum
#find whether workers can be taken from an ongoing step
def can_stop(step, kind):
    if kind not in ["By hand", "Hands-on machine"]:
        return False
    value = step.get("canStop")
    if value is None or value == "":
        return kind == "By hand"
    if not isinstance(value, bool):
        raise ConfigError(step["step"] + " canStop must be true or false.")
    return value

def machine_time(step, machine):
    if machine is not None:
        for override in step.get("machines") or []:
            if override["machine"] == machine["configName"]:
                return override["machineTime"]
    return step["machineTime"]
#the parts of one step, each part is [kind of row, minutes], the step's kind decide which time counts
def get_parts(config, batch, step, pieces=None, machine=None):
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
        parts = [["load", half], ["run", machine_time(step, machine) * multiplier], ["unload", half]]
    #if hands-on machine, machine is busy entire time
    elif kind == "Hands-on machine":
        parts = [["run", machine_time(step, machine) * multiplier]]
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

#make one worker break row
def make_break_row(worker, start, end):
    return {
        "who": worker["name"],
        "type": "worker",
        "kind": "break",
        "batch": "",
        "step": "",
        "start": start,
        "end": end
    }

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
    start_clock = scenario["startClock"]
    for i in range(len(equipment)):
        count = find_count(scenario, equipment[i]["name"])
        #find when the machine can be used tonight
        from_minutes = 0
        to_minutes = None
        for k in range(len(scenario["equipment"])):
            tonight = scenario["equipment"][k]
            if tonight["name"] == equipment[i]["name"]:
                from_minutes = clock_to_minutes(tonight.get("from", ""), start_clock)
                to_minutes = clock_to_minutes(tonight.get("to", ""), start_clock)
                if from_minutes is None:
                    from_minutes = 0
                break
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
                "configName": equipment[i]["name"],
                "from": from_minutes,
                "to": to_minutes,
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

#turn tonight's breaks into start and end minutes for each worker
def make_breaks(staff, start_clock, shift_start, shift_end):
    breaks = []
    scheduled = staff.get("breaks") or []
    for i in range(len(scheduled)):
        minutes = scheduled[i]["minutes"]
        if (not isinstance(minutes, (int, float)) or isinstance(minutes, bool)
                or not math.isfinite(minutes) or minutes < 0):
            raise ConfigError("Break minutes must be a valid nonnegative number.")
        if minutes == 0:
            continue
        start = clock_to_minutes(scheduled[i].get("at", ""), start_clock)
        #spread breaks through the shift when no time is given
        if start is None:
            start = shift_start + (shift_end - shift_start) * (i + 1) / (len(scheduled) + 1)
        elif start < shift_start:
            start = start + 24 * 60
        end = start + minutes
        if start < shift_start or end > shift_end:
            raise ConfigError("Break must be within the worker's shift.")
        breaks.append({
            "start": start,
            "end": end
        })
    breaks.sort(key=lambda row: row["start"])
    #breaks cannot overlap each other
    for i in range(1, len(breaks)):
        if breaks[i]["start"] < breaks[i - 1]["end"]:
            raise ConfigError("Worker breaks cannot overlap.")
    return breaks

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
        after_shift = staff[i].get("afterShift") or "Goes home"
        if after_shift not in ["Goes home", "Stays until done"]:
            raise ConfigError(role + " has an invalid afterShift setting.")
        breaks = make_breaks(staff[i], start_clock, shift_start, shift_end)
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
                "afterShift": after_shift,
                "breaks": [row.copy() for row in breaks],
                "busyUntil": 0,
                "currentTask": None,
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
        #information about the work this part is currently doing
        self.current_task = None
    #this part cannot continue with tonight's resources
    def block(self, reason):
        self.batch.setdefault("blocked", []).append(reason)
        while True:
            self.passivate()
    #a machine takes no new load at or after its to time
    def machine_closed(self, machine):
        return machine["to"] is not None and self.env.now() >= machine["to"]
    #wait for a free machine or machine space that can do this step
    def get_machine(self, step_name):
        start = self.env.now()
        while True:
            now = self.env.now()
            can_use = []
            resources = []
            next_times = []
            for i in range(len(self.machines)):
                machine = self.machines[i]
                if step_name not in machine["canDo"]:
                    continue
                #skip machines that are closed for tonight
                if machine["to"] is not None and now >= machine["to"]:
                    continue

                #wait for machines that open later
                if now < machine["from"]:
                    next_times.append(machine["from"])
                    continue

                #check again when this machine closes
                if machine["to"] is not None:
                    next_times.append(machine["to"])

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
            #if no machine is open, wait until one opens
            if len(resources) == 0:
                if len(next_times) == 0:
                    self.block("No machine tonight can do " + step_name + ".")
                self.hold(min(next_times) - now)
                continue
            #check machine availability again when a machine opens or closes
            next_time = min(next_times) if next_times else None
            self.request(
                *resources,
                oneof=True,
                request_priority=self.batch["priority"],
                fail_at=next_time
            )
            if self.failed():
                continue
            #find the machine and resource that were claimed
            for i in range(len(can_use)):
                machine = can_use[i][0]
                resource = can_use[i][1]

                if self.isclaiming(resource):
                    #make sure the machine did not close while waiting
                    if machine["to"] is not None and self.env.now() >= machine["to"]:
                        self.release(resource)
                        break
                    #record waiting for a machine or space
                    if self.env.now() > start:
                        row = make_row(
                            self.batch, step_name, "waiting", start, self.env.now()
                        )
                        row["for"] = "a machine"
                        self.rows.append(row)
                    return machine, resource
    #find the workers that can do the step, each with the minute they are free
    def free_workers(self, step_name, duration):
        now = self.env.now()
        can_use = []
        #find workers that can do the step and have enough shift time
        for i in range(len(self.workers)):
            worker = self.workers[i]
            if step_name in worker["canDo"]:
                available = max(now, worker["shiftStart"], worker["busyUntil"])
                #move the starting time past any break the work would overlap
                for j in range(len(worker["breaks"])):
                    rest = worker["breaks"][j]
                    if available < rest["end"] and (
                            available >= rest["start"]
                            or available + duration > rest["start"]):
                        available = rest["end"]
                #workers can finish their current task after their shift
                #workers staying until done can also start new tasks
                if available < worker["shiftEnd"] or worker["afterShift"] == "Stays until done":
                    can_use.append([available, worker])
        #find the workers that become available first
        can_use.sort(key=lambda x: x[0])
        return can_use
    #find workers who can leave an interruptible task
    def interruptible_workers(self, step_name, duration):
        now = self.env.now()
        candidates = []
        for worker in self.workers:
            task = worker["currentTask"]
            if task is None or task is self:
                continue
            if step_name not in worker["canDo"]:
                continue
            if worker["busyUntil"] <= now:
                continue
            if now < worker["shiftStart"]:
                continue
            if now >= worker["shiftEnd"] and worker["afterShift"] != "Stays until done":
                continue
            #never take a worker during or across a break
            overlaps_break = False
            for rest in worker["breaks"]:
                if now < rest["end"] and now + duration > rest["start"]:
                    overlaps_break = True
                    break
            if not overlaps_break:
                candidates.append(worker)
        #take workers from the lowest priority orders first
        candidates.sort(
            key=lambda worker: worker["currentTask"].batch["priority"],
            reverse=True
        )
        return candidates
    
    #take one worker from an interruptible task
    def interrupt_worker(self, worker):
        task = worker["currentTask"]
        if task is None:
            return

        now = self.env.now()
        worker["currentTask"] = None
        worker["busyUntil"] = now

        #release this worker from the previous task
        task.release(worker["resource"])

        #let the previous task update its remaining work
        task.activate(priority=-1)

    #wait for enough workers that can do this step
    #priority decides who goes first when people are free at the same minute, lower goes first
    def get_workers(self, step_name, count, duration, priority=None, latest_start=None, up_to=None, share=False, allow_interrupt=False):
        start = self.env.now()
        if priority is None:
            priority = self.batch["priority"]
        if count < 1:
            raise ConfigError(step_name + " must have at least one worker.")
        if up_to is None:
            up_to = count
        #check worker availability in order priority
        self.hold(0, priority=priority)
        while True:
            now = self.env.now()
            if latest_start is not None and now >= latest_start:
                return None
            minutes = duration() if callable(duration) else duration
            if minutes == 0:
                return []
            #find when enough people can start the work
            best = None
            for number in range(count, min(up_to, len(self.workers)) + 1):
                work_time = minutes / number if share else minutes
                can_use = self.free_workers(step_name, work_time)
                if len(can_use) < number:
                    continue
                ready_time = can_use[number - 1][0]
                #start as soon as possible, using more workers when available
                if (best is None or ready_time < best[0]
                        or (ready_time == best[0] and number > best[1])):
                    best = [ready_time, number, work_time, can_use]
            #loading and unloading can take workers from stoppable work
            if allow_interrupt and (best is None or best[0] > now):
                work_time = minutes / count if share else minutes
                free = self.free_workers(step_name, work_time)
                ready = [item for item in free if item[0] <= now]
                needed = count - len(ready)
                if needed > 0:
                    candidates = self.interruptible_workers(
                        step_name, work_time
                    )
                    #only interrupt if enough workers can be obtained
                    if len(candidates) >= needed:
                        for worker in candidates[:needed]:
                            self.interrupt_worker(worker)
                        #let the interrupted tasks update their progress
                        self.hold(0, priority=priority)
                        continue
            if best is None:
                if latest_start is not None:
                    self.hold(latest_start - now, priority=priority)
                    return None
                self.block("Not enough workers can do " + step_name + ".")
            ready_time, number, work_time, can_use = best
            if ready_time > now:
                if latest_start is not None:
                    ready_time = min(ready_time, latest_start)
                self.hold(ready_time - now, priority=priority)
                continue
            assigned = []
            resources = []
            #reserve the available workers up to the maximum
            for i in range(number):
                worker = can_use[i][1]
                worker["busyUntil"] = now + work_time
                assigned.append(worker)
                resources.append(worker["resource"])
            self.request(*resources, oneof=False, request_priority=priority)
            #record how long the batch waited for workers
            if self.env.now() > start:
                row = make_row(self.batch, step_name, "waiting", start, self.env.now())
                row["for"] = "a worker"
                self.rows.append(row)
            return assigned

    #perform stoppable work without losing completed progress
    def run_interruptible(self, step, kind, part_kind, duration, assigned, machine, others=None):
        remaining = duration
        share = kind == "By hand"
        #for by hand work, keep the remaining worker-minutes
        if share:
            remaining = duration * len(assigned)
        original_count = len(assigned)
        current = list(assigned)
        paused_at = None
        while remaining > 0.000001:
            if not current:
                if paused_at is None:
                    paused_at = self.env.now()
                current = self.get_workers(
                    step["step"], original_count, remaining,
                    share=share
                )
            #hands-on equipment cannot run without all its workers
            if kind == "Hands-on machine" and len(current) < original_count:
                for worker in current:
                    worker["currentTask"] = None
                    worker["busyUntil"] = self.env.now()
                    self.release(worker["resource"])
                current = []
                continue
            start = self.env.now()
            #record any time this task was paused
            if paused_at is not None:
                if start > paused_at:
                    row = make_row(
                        self.batch, step["step"], "waiting",
                        paused_at, start
                    )
                    row["for"] = "interrupted work"
                    row["because"] = "Workers reassigned or unavailable"
                    if machine is not None:
                        row["who"] = machine["name"]
                        row["type"] = "machine"
                    self.rows.append(row)
                paused_at = None
            rate = len(current) if share else 1
            minutes = remaining / rate
            #check how long the current workers can continue before a break
            for worker in current:
                for rest in worker["breaks"]:
                    if rest["start"] >= start:
                        minutes = min(minutes, rest["start"] - start)
                        break
            #remember this task for each assigned worker
            self.current_task = {
                "step": step["step"],
                "kind": kind
            }
            for worker in current:
                worker["currentTask"] = self
                worker["busyUntil"] = start + minutes
            #record the planned work before moving the clock
            active_rows = []
            for worker in current:
                row = make_row(
                    self.batch, step["step"], part_kind,
                    start, start + minutes
                )
                row["who"] = worker["name"]
                row["type"] = "worker"
                self.rows.append(row)
                active_rows.append(row)
            if machine is not None:
                row = make_row(
                    self.batch, step["step"], part_kind,
                    start, start + minutes
                )
                row["who"] = machine["name"]
                row["type"] = "machine"
                if others:
                    row["batches"] = [self.batch["name"]] + others
                self.rows.append(row)
                active_rows.append(row)
            #wait for completion or an interruption
            self.hold(minutes)
            end = self.env.now()
            elapsed = end - start
            remaining = max(0, remaining - elapsed * rate)
            #shorten the rows if the work was interrupted
            for row in active_rows:
                row["end"] = end
            #keep workers who were not taken by another task
            current = [
                worker for worker in current
                if worker["currentTask"] is self
            ]
            if remaining <= 0.000001:
                break
            #release workers who reached a break
            for worker in list(current):
                on_break = any(
                    rest["start"] <= end < rest["end"]
                    for rest in worker["breaks"]
                )
                if on_break:
                    worker["currentTask"] = None
                    worker["busyUntil"] = end
                    self.release(worker["resource"])
                    current.remove(worker)
            #if all workers were taken, remember when the pause began
            if not current or kind == "Hands-on machine":
                paused_at = end
        #release the remaining workers when the work is finished
        for worker in current:
            worker["currentTask"] = None
            worker["busyUntil"] = self.env.now()
            self.release(worker["resource"])
        self.current_task = None
    #run the parts of one load or step
    #workers can be given when a part of a batch uses fewer people than the step's Workers box
    #others are the names of other batches whose pieces share this load
    def process_parts(self, step, kind, parts, machine, workers=None, others=None, first_workers=None):
        #each part must start when the last part ends
        started = False
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
            if not started and machine is not None and self.machine_closed(machine):
                return False
            if needs_workers:
                count, maximum = worker_limits(step)
                #individual units use their assigned number of workers
                if workers is not None:
                    count = workers
                    maximum = workers
                #staff time is shared for by hand work and load or unload
                share = (
                    (kind == "Machine" and part_kind in ["load", "unload"])
                    or kind == "By hand"
                )
                if kind == "Hands-on machine":
                    maximum = count
                #a finished machine is emptied before anyone starts a new load
                priority = None
                if part_kind == "unload":
                    priority = self.batch["priority"] / (self.batch["priority"]+1)
                wait_start = self.env.now()
                #record equipment waiting to be unloaded
                waiting_row = None
                if machine is not None and part_kind == "unload":
                    waiting_row = make_row(
                        self.batch, step["step"], "waiting",
                        wait_start, 1440
                    )
                    waiting_row["who"] = machine["name"]
                    waiting_row["type"] = "machine"
                    waiting_row["for"] = "a worker"
                    if others:
                        waiting_row["batches"] = [self.batch["name"]] + others
                    self.rows.append(waiting_row)
                if first_workers is not None and not started:
                    assigned = first_workers
                else:
                    latest_start = machine["to"] if machine is not None and not started else None
                    assigned = self.get_workers(
                        step["step"], count, duration, priority,
                        latest_start, maximum, share,
                        allow_interrupt=(
                            kind == "Machine"
                            and part_kind in ["load", "unload"]
                        )
                    )
                    if assigned is None:
                        return False
                #end the waiting row when a worker becomes available
                if waiting_row is not None:
                    waiting_row["end"] = self.env.now()
                #divide the total staff time between the assigned workers
                if share and len(assigned) > 0:
                    duration = duration / len(assigned)
            started = True
            #stoppable work keeps its progress when workers are taken
            if needs_workers and can_stop(step, kind):
                self.run_interruptible(
                    step, kind, part_kind, duration,
                    assigned, machine, others
                )
                continue
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
        return True

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
            end = machine["warmUntil"]
            if machine["to"] is not None:
                end = min(end, machine["to"])
            self.hold(max(0, end - start))
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
        if job.ispassive() or job.waiting_for_load:
            job.activate()
        while entry["left"] > 0:
            self.passivate()

    #run one unit of this part in a one by one machine space
    def run_one_by_one(self, step, kind):
        while True:
            machine, resource = self.get_machine(step["step"])
            self.warm_up(machine, step["step"])
            parts = get_parts(self.config, self.batch, step, self.pieces, machine)
            if not self.machine_closed(machine) and self.process_parts(step, kind, parts, machine):
                machine["lastRecipe"] = self.batch["recipe"]["name"]
                self.release(resource)
                return
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
                        minimum, maximum = worker_limits(step)
                        limits[key] = sim.Resource(key, capacity=maximum)
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
        self.waiting_for_load = False
    #pieces of this batch waiting here that are not in a load yet
    def own_free(self):
        return sum(entry["free"] for entry in self.entries)
    #True when every piece of this batch has arrived and is in a load
    def all_loaded(self):
        return self.arrived >= self.batch["pieces"] and self.own_free() == 0
    #take waiting pieces for one load, this batch's parts first, then other batches of the same recipe
    def take_load(self, capacity, commit=True):
        load = []
        room = capacity
        for entry in self.entries:
            take = min(entry["free"], room)
            if take > 0:
                if commit:
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
                        if commit:
                            entry["free"] = entry["free"] - take
                        room = room - take
                        load.append([entry, take])
                        took = True
                if took:
                    others.append(job.batch["name"])
                    #let the other batch check if it still has pieces to load
                    if commit and (job.ispassive() or job.waiting_for_load):
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
                self.release(resource)
                self.block("Not enough workers can switch " + machine["name"] + ".")
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
            #if the machine closed, let it go and find another machine
            if machine["to"] is not None and self.env.now() >= machine["to"]:
                self.release(resource)
                while True:
                    machine, resource = self.get_machine(step["step"])
                    if self.all_loaded():
                        self.release(resource)
                        return
                    if self.switch(machine, resource, step):
                        break
                self.warm_up(machine, step["step"])
                #the new machine may have a different capacity
                capacity = get_machine_capacity(self.config, self.batch["recipe"], machine)
                continue
            #wait for a full load or for the batch's last piece
            start = self.env.now()
            while not self.all_loaded():
                free = self.own_free()
                if free >= capacity or (self.arrived >= self.batch["pieces"] and free > 0):
                    break
                if self.machine_closed(machine):
                    break
                self.waiting_for_load = True
                if machine["to"] is None:
                    self.passivate()
                else:
                    self.hold(till=machine["to"])
                self.waiting_for_load = False
            if self.env.now() > start:
                row = make_row(self.batch, step["step"], "waiting", start, self.env.now())
                row["for"] = "a full load"
                self.rows.append(row)
            #check again because the machine may have closed while waiting for a full load
            if machine["to"] is not None and self.env.now() >= machine["to"]:
                continue
            first_workers = None
            #check workers before removing pieces from the waiting entries
            #a machine with a closing time must not start a new load after it closes
            if machine["to"] is not None:
                def first_duration():
                    preview, _ = self.take_load(capacity, commit=False)
                    if not preview:
                        return 0
                    pieces = sum(item[1] for item in preview)
                    parts = get_parts(self.config, self.batch, step, pieces, machine)
                    return parts[0][1]
                if first_duration() > 0:
                    count, maximum = worker_limits(step)
                    share = kind == "Machine"
                    if not share:
                        maximum = count
                    first_workers = self.get_workers(
                        step["step"], count, first_duration,
                        latest_start=machine["to"],
                        up_to=maximum, share=share,
                        allow_interrupt=(kind == "Machine")
                    )
                    if first_workers is None:
                        continue
            load, others = self.take_load(capacity)
            if len(load) == 0:
                for worker in first_workers or []:
                    worker["busyUntil"] = self.env.now()
                    self.release(worker["resource"])
                break
            pieces = sum(item[1] for item in load)
            parts = get_parts(self.config, self.batch, step, pieces, machine)
            self.process_parts(step, kind, parts, machine, others=others,
                               first_workers=first_workers)
            machine["lastRecipe"] = self.batch["recipe"]["name"]
            #parts move on as soon as all their own pieces are done
            for item in load:
                entry = item[0]
                entry["left"] = entry["left"] - item[1]
                if entry["left"] <= 0 and entry["part"].ispassive():
                    entry["part"].activate()
        #let the machine go after the batch's last load is out
        self.release(resource)

#add up each machine's minutes without counting overlapping loads twice
def make_equipment_summary(machines, rows, finish):
    summary = []
    for machine in machines:
        totals = {
            "inUse": 0,
            "waitingForWorker": 0,
            "switching": 0,
            "warmingUp": 0,
            "unavailable": 0,
            "idle": 0
        }
        #find the event rows for this machine
        events = [
            row for row in rows
            if row["type"] == "machine"
            and row["who"] == machine["name"]
        ]
        #collect every time when the machine's status could change
        times = {0, finish}
        opening = min(finish, max(0, machine["from"]))
        closing = finish
        if machine["to"] is not None:
            closing = min(finish, max(0, machine["to"]))
        times.add(opening)
        times.add(closing)
        for row in events:
            times.add(max(0, min(finish, row["start"])))
            times.add(max(0, min(finish, row["end"])))
        times = sorted(times)
        #give every interval exactly one machine status
        for i in range(len(times) - 1):
            start = times[i]
            end = times[i + 1]
            minutes = end - start
            if minutes <= 0:
                continue
            active = [
                row for row in events
                if row["start"] < end and row["end"] > start
            ]
            #active production wins when several loads overlap
            if any(row["kind"] in ["load", "run", "unload"]
                   for row in active):
                category = "inUse"
            elif any(row["kind"] == "waiting" for row in active):
                category = "waitingForWorker"
            elif start < opening or start >= closing:
                category = "unavailable"
            elif any(row["kind"] == "switch" for row in active):
                category = "switching"
            elif any(row["kind"] == "warmup" for row in active):
                category = "warmingUp"
            else:
                category = "idle"
            totals[category] += minutes
        summary.append({
            "who": machine["name"],
            **totals
        })
    return summary
#make the summary of tonight's simulation
def make_summary(orders, batches, workers, rows, finish, reason, machines):
    summary_orders = []
    for i in range(len(orders)):
        order = orders[i]
        #find all batches that belong to this order
        order_batches = [
            batch for batch in batches
            if batch["order"] == order["priority"]
        ]
        deadline = order["deadlineMinutes"]
        #an order is not finished if any of its batches are unfinished
        if not order_batches or any("ready" not in batch for batch in order_batches):
            ready = None
            status = "Not finished"
            late_by = None
        else:
            #the order is ready when its last batch finishes
            ready = max(batch["ready"] for batch in order_batches)
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
    #report each batch that did not finish
    unfinished = []
    for batch in batches:
        if "ready" not in batch:
            unfinished.append({
                "batch": batch["name"],
                "piecesRemaining": batch["pieces"] - batch["donePieces"],
                "reason": batch.get("blocked") or [reason]
            })
    #each person's working, waiting and break minutes
    summary_staff = []
    for i in range(len(workers)):
        worker = workers[i]
        working = 0
        overtime = 0
        on_break = 0
        for j in range(len(rows)):
            row = rows[j]
            if row["type"] == "worker" and row["who"] == worker["name"]:
                if row["kind"] == "break":
                    start = max(row["start"], worker["shiftStart"])
                    end = min(row["end"], worker["shiftEnd"], finish)
                    on_break = on_break + max(0, end - start)
                else:
                    working = working + row["end"] - row["start"]
                    #minutes worked after the scheduled shift
                    overtime += max(
                        0,
                        row["end"] - max(row["start"], worker["shiftEnd"])
                    )
        #regular shift minutes until the simulation finishes
        on_shift = max(
            0,
            min(worker["shiftEnd"], finish) - worker["shiftStart"]
        )
        summary_staff.append({
            "who": worker["name"],
            "working": working,
            "waiting": max(0, on_shift - (working - overtime) - on_break),
            "overtime": overtime,
            "onBreak": on_break
        })
    #each machine's in use, waiting for worker, switching, warming up and idle minutes
    summary_equipment = []
    for machine in machines or []:
        machine_rows = [
            row for row in rows
            if row["type"] == "machine" and row["who"] == machine["name"]
        ]
        in_use = covered_minutes([
            row for row in machine_rows if row["kind"] in ["load", "run", "unload"]
        ])
        waiting_for_worker = covered_minutes([
            row for row in machine_rows if row["kind"] == "waitingForWorker"
        ])
        switching = covered_minutes([
            row for row in machine_rows if row["kind"] == "switch"
        ])
        warming_up = covered_minutes([
            row for row in machine_rows if row["kind"] == "warmup"
        ])
        busy = in_use + waiting_for_worker + switching + warming_up
        summary_equipment.append({
            "name": machine["name"],
            "inUse": in_use,
            "waitingForWorker": waiting_for_worker,
            "switching": switching,
            "warmingUp": warming_up,
            "idle": max(0, finish - busy)
        })
    #which order item each batch belongs to
    batch_item = {}
    for i in range(len(orders)):
        for batch in batches:
            if batch["order"] == orders[i]["priority"]:
                batch_item[batch["name"]] = orders[i]["item"]
    #how long each item spent at each step, from its first batch starting the step to its last batch finishing it
    summary_steps = []
    for i in range(len(orders)):
        order = orders[i]
        names = set(
            batch["name"] for batch in batches
            if batch["order"] == order["priority"]
        )
        spans = {}
        for row in rows:
            if not row.get("step"):
                continue
            if not any(name in names for name in row_batches(row)):
                continue
            if row["step"] not in spans:
                spans[row["step"]] = [row["start"], row["end"]]
            else:
                spans[row["step"]][0] = min(spans[row["step"]][0], row["start"])
                spans[row["step"]][1] = max(spans[row["step"]][1], row["end"])
        if len(spans) == 0:
            continue
        first_start = min(span[0] for span in spans.values())
        ready = max(batch["ready"] for batch in batches if batch["name"] in names)
        summary_steps.append({
            "item": order["item"],
            "steps": [
                {"step": step, "minutes": span[1] - span[0]}
                for step, span in spans.items()
            ],
            "total": ready - first_start
        })
    #every time a batch waited, for the Find out why sections
    summary_waits = []
    for row in rows:
        if row["type"] == "batch" and row["kind"] == "waiting":
            summary_waits.append({
                "item": batch_item.get(row["batch"], row["batch"]),
                "batch": row["batch"],
                "step": row["step"],
                "start": row["start"],
                "minutes": row["end"] - row["start"],
                "for": row.get("for", ""),
                #the engine does not record why yet
                "because": ""
            })
    return {
        "finish": finish,
        "reason": reason,
        "unfinished": unfinished,
        "orders": summary_orders,
        "staff": summary_staff,
        "equipment": make_equipment_summary(machines, rows, finish)
    }

#run the night and give back the event log and summary
def run_night(config, scenario, include_summary=False):
    validate_step_settings(config)
    orders = get_orders(config, scenario)
    batches = make_batches(config, orders)
    rows = []
    #a new simulation clock n it starts at minute 0
    env = sim.Environment()
    #make tonight machines after the clock
    machines = make_machines(config, scenario)
    #make tonight workers after the clock
    workers = make_workers(config, scenario)
    #record each worker's breaks tonight
    for i in range(len(workers)):
        worker = workers[i]
        for j in range(len(worker["breaks"])):
            rest = worker["breaks"][j]
            rows.append(make_break_row(worker, rest["start"], rest["end"]))
    #machines set to "At shift start" start warming up at their from time
    for i in range(len(machines)):
        machine = machines[i]
        if machine["warmUpTime"] > 0 and machine["turnOn"] != "When first needed":
            machine["warmUntil"] = machine["from"] + machine["warmUpTime"]
            rows.append(make_warmup_row(machine, machine["from"], machine["warmUntil"]))
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
    
    #start the simulation at minute 0
    env.run(till=0)
    #move the clock until all batches finish, nothing can move or 24 hours have passed
    while any("ready" not in batch for batch in batches):
        next_time = env.peek()
        if math.isinf(next_time) or env.now() >= 1440:
            break
        env.run(till=min(next_time, 1440))
    finish = env.now()
    if all("ready" in batch for batch in batches):
        reason = "Completed"
    elif finish >= 1440:
        reason = "24-hour limit reached"
    else:
        reason = "Nothing could move"
    #do not include events beyond the end of the simulation
    rows = [row for row in rows if row["start"] < finish]
    for row in rows:
        row["end"] = min(row["end"], finish)
    #remove rows where no time passed
    rows = [row for row in rows if row["end"] > row["start"]]
    #explain the reason for each recorded waiting event
    waiting_reasons = {
        "a worker": "Required workers are unavailable",
        "a machine": "Required equipment or space is unavailable",
        "a full load": "Waiting for more pieces to arrive",
        "warm-up": "Equipment has not finished warming up",
        "interrupted work": "Workers reassigned or unavailable"
    }
    for row in rows:
        if row["kind"] == "waiting":
            row.setdefault(
                "because",
                waiting_reasons.get(row.get("for"), "Waiting for production resources")
            )
    if include_summary:
        return {
            "scenario": scenario["name"],
            "startClock": scenario["startClock"],
            "rows": rows,
            "summary": make_summary(orders, batches, workers, rows, finish, reason, machines)
        }
    return rows
#test run
if __name__ == "__main__":
    config = load_json(DATA_DIR / "config.sample.json")
    scenario = load_json(DATA_DIR / "scenario.sample.json")
    rows = run_night(config, scenario)
    for i in range(len(rows)):
        print(rows[i]["batch"], rows[i]["step"], rows[i]["kind"], rows[i]["start"], rows[i]["end"], rows[i]["who"])