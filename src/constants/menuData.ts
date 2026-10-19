import { ImageSourcePropType } from "react-native";

const BURGER_IMG = require("../../assets/images/menu/burger-cheesy-smash.jpg");
const FRIES_IMG = require("../../assets/images/menu/fries-bacon-loaded.jpg");
const DRINK_IMG = require("../../assets/images/menu/cider-annabelle.jpg");
const SHOOTER_IMG = require("../../assets/images/menu/shooter-ponchos.jpg");

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
};

export type MenuCategory = {
  name: string;
  image: ImageSourcePropType;
  items: MenuItem[];
};

export const FOOD_MENU: MenuCategory[] = [
  {
    name: "Specials",
    image: BURGER_IMG,
    items: [
      {
        id: "f1",
        name: "Tapas Double Trouble",
        description: "2 Cheeseburgers & Chips, 2 x 500ml Black Labels",
        price: 100,
      },
    ],
  },
  {
    name: "Burgers",
    image: BURGER_IMG,
    items: [
      { id: "f2", name: "Tripple Cheese Burger", price: 75 },
      { id: "f3", name: "Cheesy Smash Burger", price: 75 },
      { id: "f4", name: "Double Cheesy Smash Burger", price: 100 },
      { id: "f5", name: "Double Rib Burger", price: 75 },
      { id: "f6", name: "Fillet Burger", price: 75 },
      { id: "f7", name: "Prego Burger (Fillet)", price: 75 },
      { id: "f8", name: "Double Fillet Burger", price: 110 },
      { id: "f9", name: "Fillet Burger with Sauce", price: 100 },
      { id: "f10", name: "Double Fillet Burger with Sauce", price: 135 },
      { id: "f11", name: "Bacon, Egg & Cheese Burger", price: 75 },
      { id: "f12", name: "Double Bacon, Egg & Cheese Burger", price: 100 },
      { id: "f13", name: "Veggie Burger", price: 75 },
      { id: "f14", name: "Double Chicken Burger", price: 75 },
      { id: "f15", name: "Chicken Burger with Sauce", price: 75 },
    ],
  },
  {
    name: "R50 Meals",
    image: BURGER_IMG,
    items: [
      { id: "f16", name: "Double Cheese Burger & Chips", price: 50 },
      { id: "f17", name: "Rib Burger & Chips", price: 50 },
      { id: "f18", name: "Chicken Burger & Chips", price: 50 },
      { id: "f19", name: "Loaded Fries (Bacon)", price: 50 },
      { id: "f20", name: "Loaded Fries (Jalapeno)", price: 50 },
      { id: "f21", name: "Fillet (150g) & Chips", price: 50 },
    ],
  },
  {
    name: "Golden Oldies",
    image: FRIES_IMG,
    items: [
      { id: "f22", name: "Chicken Schnitzel & Sauce", price: 75 },
      { id: "f23", name: "2 Chicken Schnitzel & Sauce", price: 100 },
      { id: "f24", name: "5 Chicken Strips", price: 75 },
      { id: "f25", name: "8 Chicken Wings", price: 99 },
      { id: "f26", name: "300g Rump Steak & Egg", price: 120 },
      { id: "f27", name: "300g Rump Steak with Sauce", price: 135 },
      { id: "f28", name: "Medium Chips", price: 30 },
      { id: "f29", name: "Large Chips", price: 50 },
      { id: "f30", name: "Loaded Fries with Bacon", price: 50 },
      { id: "f31", name: "Loaded Fries with Jalapeno", price: 50 },
      {
        id: "f32",
        name: "Meaty Plankie",
        description: "Wings, Russian bites, steak strips & chips",
        price: 120,
      },
    ],
  },
  {
    name: "Starters",
    image: FRIES_IMG,
    items: [
      { id: "f33", name: "Crumbed Mushrooms", price: 75 },
      { id: "f34", name: "4 Chicken Wings", price: 75 },
    ],
  },
  {
    name: "Add-ons",
    image: FRIES_IMG,
    items: [
      { id: "f35", name: "Cheese", price: 15 },
      { id: "f36", name: "Feta", price: 20 },
      { id: "f37", name: "Egg", price: 15 },
      { id: "f38", name: "Bacon", price: 15 },
      { id: "f39", name: "Onion Rings", price: 35 },
      { id: "f40", name: "Russian", price: 35 },
      { id: "f41", name: "Jalapeno", price: 10 },
      { id: "f42", name: "Mushroom Sauce", price: 20 },
      { id: "f43", name: "Cheese Sauce", price: 20 },
    ],
  },
];

export const DRINKS_MENU: MenuCategory[] = [
  {
    name: "Beers",
    image: DRINK_IMG,
    items: [
      { id: "d1", name: "Black Label 300ml", price: 28 },
      { id: "d2", name: "Black Label 500ml", price: 30 },
      { id: "d3", name: "Castle Lite", price: 28 },
      { id: "d4", name: "Castle Lite 500ml", price: 30 },
      { id: "d5", name: "Corona", price: 35 },
      { id: "d6", name: "Flying Fish", price: 30 },
      { id: "d7", name: "Heineken", price: 30 },
      { id: "d8", name: "Hunter's", price: 30 },
      { id: "d9", name: "Savanna", price: 35 },
      { id: "d10", name: "Stella", price: 30 },
      { id: "d11", name: "Windhoek Draught", price: 35 },
    ],
  },
  {
    name: "Ciders",
    image: DRINK_IMG,
    items: [
      { id: "d12", name: "Black Crown", price: 30 },
      { id: "d13", name: "Belgravia", price: 35 },
      { id: "d14", name: "Brutal Fruit", price: 28 },
      { id: "d15", name: "Mxd", price: 35 },
      {
        id: "d16",
        name: "Annabelle",
        description: "Cuvee Rose Petillant",
        price: 35,
      },
      { id: "d17", name: "Bernini", price: 35 },
      { id: "d18", name: "Chateau", price: 35 },
    ],
  },
  {
    name: "Soft Drinks",
    image: DRINK_IMG,
    items: [
      { id: "d19", name: "Appeltizer", price: 30 },
      { id: "d20", name: "Coke/Fanta/Sprite", price: 20 },
      { id: "d21", name: "Juice", price: 20 },
      { id: "d22", name: "Water", price: 20 },
      { id: "d23", name: "Soda/Tonic/Lemonade", price: 20 },
      { id: "d24", name: "Redbull", price: 30 },
      { id: "d25", name: "Switch", price: 20 },
    ],
  },
  {
    name: "Jugs",
    image: DRINK_IMG,
    items: [
      { id: "d26", name: "Vodka & Twist", price: 65 },
      { id: "d27", name: "Gin & Blueberry", price: 65 },
      { id: "d28", name: "Rum & Raspberry", price: 65 },
      { id: "d29", name: "Tequila & Twist", price: 65 },
      { id: "d30", name: "Whiskey & Ginger", price: 65 },
      { id: "d31", name: "Brandy & Cola", price: 65 },
      { id: "d32", name: "Malibu & Pine", price: 65 },
    ],
  },
  {
    name: "Cocktails",
    image: DRINK_IMG,
    items: [
      { id: "d33", name: "GinBull", price: 45 },
      { id: "d34", name: "VodkaBull", price: 45 },
      { id: "d35", name: "Rumbull", price: 45 },
      { id: "d36", name: "Margarita", price: 65 },
      { id: "d37", name: "Pina Colade", price: 65 },
      { id: "d38", name: "Singapore sling", price: 65 },
      { id: "d39", name: "Strawberry Daiquiri", price: 65 },
      { id: "d40", name: "Cosmo", price: 65 },
      { id: "d41", name: "Mojito", price: 65 },
      { id: "d42", name: "Berry Vodkarita", price: 65 },
    ],
  },
  {
    name: "Shooters",
    image: SHOOTER_IMG,
    items: [
      { id: "d43", name: "Ponchos 1910 Rosado Tequila", price: 10 },
      { id: "d44", name: "Amarula", price: 10 },
      { id: "d45", name: "CocoRico", price: 10 },
      { id: "d46", name: "Fire Ball", price: 10 },
      { id: "d47", name: "Hit & Run", price: 10 },
      { id: "d48", name: "Melktertjies", price: 10 },
      { id: "d49", name: "Obs", price: 10 },
      { id: "d50", name: "Sours", price: 10 },
      { id: "d51", name: "Strawberry Lips", price: 15 },
      { id: "d52", name: "Butlers", price: 18 },
      { id: "d53", name: "Cactus Jack", price: 15 },
      { id: "d54", name: "Carvo", price: 20 },
      { id: "d55", name: "Don Julio Tequila", price: 60 },
      { id: "d56", name: "Jaggermeister", price: 25 },
      { id: "d57", name: "Stroh 60", price: 30 },
      { id: "d58", name: "Olmeca Tequila", price: 25 },
      { id: "d59", name: "Altos Tequila", price: 30 },
      { id: "d60", name: "Oestertjie", price: 25 },
      { id: "d61", name: "Po10c", price: 25 },
      { id: "d62", name: "Shanky's Whip", price: 25 },
      { id: "d63", name: "Blowjob", price: 30 },
      { id: "d64", name: "Kick Ass", price: 30 },
      { id: "d65", name: "Pancake", price: 30 },
      { id: "d66", name: "Springbokkie", price: 25 },
      { id: "d67", name: "Turkish Delight", price: 30 },
    ],
  },
  {
    name: "Spirits",
    image: DRINK_IMG,
    items: [
      { id: "d68", name: "Aviation Gin", price: 48 },
      { id: "d69", name: "Beefeater Gin", price: 25 },
      { id: "d70", name: "Inveroche Gin", price: 35 },
      { id: "d71", name: "Buffelsfontein Brandy", price: 18 },
      { id: "d72", name: "Richelieu Brandy", price: 15 },
      { id: "d73", name: "Klipdrift Brandy", price: 15 },
      { id: "d74", name: "Kwv 3", price: 18 },
      { id: "d75", name: "Kwv 5", price: 20 },
      { id: "d76", name: "Kwv 10", price: 28 },
      { id: "d77", name: "Klipdrift Premium", price: 20 },
      { id: "d78", name: "Hennessy", price: 45 },
      { id: "d79", name: "Martell", price: 45 },
      { id: "d80", name: "Bell's", price: 22 },
      { id: "d81", name: "Chivas Regal", price: 30 },
      { id: "d82", name: "Glenlivet Founders", price: 45 },
      { id: "d83", name: "Glenbrynth", price: 22 },
      { id: "d84", name: "Jack Daniels", price: 30 },
      { id: "d85", name: "Jack Honey", price: 30 },
      { id: "d86", name: "Jack Fire", price: 30 },
      { id: "d87", name: "Jameson", price: 25 },
      { id: "d88", name: "Jameson Triple", price: 27 },
      { id: "d89", name: "Jameson Select", price: 30 },
      { id: "d90", name: "J&B", price: 25 },
      { id: "d91", name: "Johnnie Black", price: 30 },
      { id: "d92", name: "Johnnie Red", price: 25 },
    ],
  },
  {
    name: "Wine",
    image: DRINK_IMG,
    items: [
      { id: "d93", name: "House White", price: 25 },
      { id: "d94", name: "House Red", price: 25 },
    ],
  },
];
