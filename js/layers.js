var layers = {
    l: {
        startData() { return {
            unl: true,
			points: new Decimal(0),
            best: new Decimal(0),
            total: new Decimal(0),
            buyables: {}, // You don't actually have to initialize this one
            beep: false,
        }},
        color: "#4BEC13",
        requires() {return new Decimal(10)}, // Can be a function that takes requirement increases into account
        resource: "lines", // Name of prestige currency
        baseResource: "characters", // Name of resource prestige is based on
        baseAmount() {return player.points},
        type: "normal", // normal: cost to gain currency depends on amount gained. static: cost depends on how much you already have
        exponent: 0.5, // Prestige currency exponent
        base: 5, // Only needed for static layers, base of the formula (b^(x^exp))
        resCeil: false, // True if the resource needs to be rounded up
        canBuyMax() {}, // Only needed for static layers
        gainMult() {
            mult = new Decimal(1)
            if (player.l.upgrades.includes(21)) mult = mult.times(2)
			if (player.l.upgrades.includes(23)) mult = mult.times(LAYER_UPGS.l[23].currently())
            return mult
        },
        gainExp() {
            return new Decimal(1)
        },
        row: 0,
        effect() {return { // Formulas for any boosts inherent to resources in the layer. Can return a single value instead of an object if there is just one effect
            waffleBoost: (true == false ? 0 : Decimal.pow(player.l.points, 0.2)),
            icecreamCap: (player.l.points * 10)
        }},
        effectDescription() {
            eff = layers.l.effect();
            return "which are boosting waffles by "+format(eff.waffleBoost)+" and increasing the Ice Cream cap by "+format(eff.icecreamCap)
        },
        milestones: {
            0: {requirementDesc: "3 Lollipops",
            done() {return player.l.best.gte(3)},
            effectDesc: "Makes this green",
            },
            1: {requirementDesc: "4 Lollipops",
            done() {return player.l.best.gte(4)},
            effectDesc: "You can toggle beep and boop (which do nothing)",
            toggles: [
                ["l", "beep"], // Each toggle is defined by a layer and the data toggled for that layer
                ["f", "boop"]],
            }
        },
        upgrades: {
            rows: 1,
            cols: 3,
            11: {
                desc: "Gain 1 Candy every second.",
                cost: new Decimal(1),
                unl() { return player.l.unl },
            },
            12: {
                desc: "Candy generation is faster based on your unspent Lollipops.",
                cost: new Decimal(1),
                unl() { return player.l.upgrades.includes(11) },
                effect() {
                    let ret = player.l.points.add(1).pow(player.l.upgrades.includes(24)?1.1:(player.l.upgrades.includes(14)?0.75:0.5)) 
                    if (ret.gte("1e20000000")) ret = ret.sqrt().times("1e10000000")
                    return ret;
                },
                effDisp(fx) { return format(fx)+"x" },
            },
            13: {
                desc: "Make this layer act like you bought it first.",
                cost: new Decimal(69),
                currencyDisplayName: "candies", // Use if using a nonstandard currency
                currencyInternalName: "points", // Use if using a nonstandard currency
                currencyLayer: "", // Leave empty if not in a layer "e.g. points"
                unl() { return player.l.upgrades.includes(12) },
                onPurchase() {
                    player.l.order = 0
                }
            },
        },
        buyables: {
            rows: 1,
            cols: 1,
            respec() { // Optional, reset things and give back your currency. Having this function makes a respec button appear
                player.l.points = player.l.points.add(player.l.spentOnBuyables) // A built-in thing to keep track of this but only keeps a single value
                resetBuyables("l")
                doReset("l", true) // Force a reset
            },
            respecText: "Respec Thingies", // Text on Respec button, optional
            11: {
                title: "Exhancers", // Optional, displayed at the top in a larger font
                cost(x) { // cost for buying xth buyable, can be an object if there are multiple currencies
                    if (x.gte(25)) x = x.pow(2).div(25)
                    let cost = Decimal.pow(2, x.pow(1.5))
                    return cost.floor()
                },
                effect(x) { // Effects of owning x of the items, x is a decimal
                    let eff = {}
                    if (x.gte(0)) eff.first = Decimal.pow(25, x.pow(1.1))
                    else eff.first = Decimal.pow(1/25, x.times(-1).pow(1.1))
                
                    if (x.gte(0)) eff.second = x.pow(0.8)
                    else eff.second = x.times(-1).pow(0.8).times(-1)
                    return eff;
                },
                display (){
                    let data = tmp.buyables.c["11"]
                    return "Cost: " + format(data.cost) + " lollipops\n\
                    Amount: " + player.l.buyables["11"] + "\n\
                    Adds + " + format(data.effects.first) + " things and multiplies stuff by " + format(data.effects.second)
                },
                unl() { return player.l.unl },
                canAfford() {return player.l.points.gte(tmp.buyables.c[11].cost)},
                buy() {
                    cost = tmp.buyables.c[11].cost
                    player.l.points = player.l.points.sub(cost)	
                    player.l.buyables[11] = player.l.buyables[11].add(1)
                    player.l.spentOnBuyables = player.l.spentOnBuyables.add(cost) // This is a built-in system that you can use for respeccing but it only works with a single Decimal value
                },
                buyMax() {}, // You'll have to handle this yourself if you want
            },
        },
        doReset(layer){
            if(layers[layer].row > layers["l"].row) fullLayerReset('c') // This is actually the default behavior
        },
        convertToDecimal() {
            // Convert any layer-specific values (besides points, total, and best) to Decimal
        },
        layerShown() {return true}, // Condition for when layer appears
        update(diff) {
            if (player.l.upgrades.includes(11)) player.points = player.points.add(tmp.pointGen.times(diff)).max(0)
        }, // Do any gameloop things (e.g. resource generation) inherent to this layer
        automate() {
        }, // Do any automation inherent to this layer if appropriate
        updateTemp() {
        }, // Do any necessary temp updating
        resetsNothing() {return false},
        hotkeys: [
            {key: "l", desc: "L: reset for lines.", onPress(){if (player.l.unl) doReset("l")}},
            {key: "ctrl+c", desc: "Ctrl+c: respec things", onPress(){if (player.l.unl) respecBuyables("l")}},
        ],
        incr_order: [], // Array of layer names to have their order increased when this one is first unlocked

        // Optional, lets you format the tab yourself by listing components. You can create your own components in v.js.
        tabFormat: ["main-display",
                    ["prestige-button", function(){return "Compile your characters into "}],
                    ["display-text",
                        function() {return 'You have ' + format(player.points) + ' lines.'},
                        {"color": "white", "font-size": "32px"}],
                    ["buyables", "150px"],
                    ["toggle", ["l", "beep"]],
                    "milestones", "upgrades"],
        style: {
            'background-color': '#6b0b9e'
        },
    }, 

    f: {
        startData() { return {
            unl: false,
			points: new Decimal(0),
            boop: false,
        }},
        color: "#FE0102",
        requires() {return new Decimal(200)}, 
        resource: "farm points", 
        baseResource: "candies", 
        baseAmount() {return player.points},
        type: "normal", 
        exponent: 0.5, 
        gainMult() {
            return new Decimal(1)
        },
        gainExp() {
            return new Decimal(1)
        },
        row: 1,
        layerShown() {return true}, 
        branches: [["l", 1]] // Each pair corresponds to a line added to the tree when this node is unlocked. The letter is the other end of the line, and the number affects the color, 1 is default
    }, 
} 

function layerShown(layer){
    return layers[layer].layerShown();
}

var LAYERS = Object.keys(layers);

var hotkeys = {};



var ROW_LAYERS = {}
for (layer in layers){
    row = layers[layer].row
    if(!ROW_LAYERS[row]) ROW_LAYERS[row] = {}

    ROW_LAYERS[row][layer]=layer;
}

function addLayer(layerName, layerData){ // Call this to add layers from a different file!
    layers[layerName] = layerData
    LAYERS = Object.keys(layers);
    ROW_LAYERS = {}
    for (layer in layers){
        row = layers[layer].row
        if(!ROW_LAYERS[row]) ROW_LAYERS[row] = {}
    
        ROW_LAYERS[row][layer]=layer;
    }
    updateHotkeys()
}
