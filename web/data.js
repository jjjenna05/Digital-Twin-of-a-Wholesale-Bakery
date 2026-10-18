const equipment = [
   {
    equipmentName: "Oven A",
    canDo: ["Bake"],
    quantity: 1,
    capacity: {
      amount: 12,
      unit: "Trays" 
      },
    loads: "When full",
    switchTime: {
      amount: 5,
      unit: "min"
    },
    warmUpTime: {
      amount: 20,
      unit: "min"
    },
    turnOn: "At shift start",
   },
   {
      equipmentName: "Oven B",
      canDo: ["Bake"],
      quantity: 1,
      capacity: {
        amount: 6,
        unit: "Trays"
      },
      loads: "When full",
      switchTime: {
        amount: 5,
        unit: "min"
      },
      warmUpTime: {
        amount: 20,
        unit: "min"
      },
      turnOn: "At shift start",
   },
   {
      equipmentName: "Mixer A",
      canDo: ["Mix"],
      quantity: 1,
      capacity: {
        amount: 100,
        unit: "Pounds"
      },
      loads: "When full",
      switchTime: {
        amount: 10,
        unit: "min"
      },
      warmUpTime: {
         amount: null,  
         unit: "min"
      },
      turnOn: "At shift start",
   },
   {
      equipmentName: "Proofer A",
      canDo: ["Proof"],
      quantity: 1,
      capacity: {
        amount: 4,
        unit: "Racks"
      },
      loads: "When full",
      switchTime: {
        amount: 0,
        unit: "min"
      },
      warmUpTime: {
        amount: 15,
        unit: "min"
      },
      turnOn: "At shift start",
   },
   {
      equipmentName: "Fryer",
      canDo: ["Fry"],
      quantity: 1,
      capacity: {
        amount: 48,
        unit: "Pieces"
      },
      loads: "When full",
      switchTime: {
        amount: 0,
        unit: "min"
      },
      warmUpTime: {
        amount: 10,
        unit: "min"
      },
      turnOn: "When first needed",
   },
   {
      equipmentName: "Sheeter",
      canDo: ["Laminate"],
      quantity: 1,
      capacity: {
        amount: 40,
        unit: "Pounds"
      },
      loads: "When full",
      switchTime: {
        amount: 0,
        unit: "min"
      },
      warmUpTime: {
        amount: null,
        unit: "min"
      },
      turnOn: "At shift start",
   }
]
