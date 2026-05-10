export type PortionSize = "small" | "medium" | "large";
export type PortionMode = "weight" | "unit";

export type FoodReferenceItem = {
  id: string;
  name: string;
  aliases: string[];
  kcalPer100g: number;
  defaultServingGrams: number;
  portionMode: PortionMode;
};

export type MealEstimateInput = {
  foodDescription: string;
  portionSize?: PortionSize | "" | null;
};

export type MealEstimateResult =
  | {
      matched: true;
      food: FoodReferenceItem;
      displayName: string;
      portionSize: PortionSize;
      portionMode: PortionMode;
      grams: number;
      calories: number;
    }
  | {
      matched: false;
      reason: "multiple_foods" | "not_found" | "empty";
      message: string;
    };

const portionGrams: Record<PortionSize, number> = {
  small: 125,
  medium: 225,
  large: 375,
};

const standaloneFoodWords = [
  "rice",
  "chicken",
  "beef",
  "pork",
  "fish",
  "egg",
  "apple",
  "banana",
  "pizza",
  "burger",
  "pasta",
  "salad",
  "bread",
  "tofu",
  "potato",
];

export const foodReferenceLibrary: FoodReferenceItem[] = [
  // Chinese staples and breakfast
  item("rice", "Rice", ["rice", "white rice", "steamed rice", "米饭", "白米饭", "饭"], 116, 225, "weight"),
  item("congee", "Congee", ["congee", "rice porridge", "porridge", "粥", "白粥", "米粥"], 46, 300, "weight"),
  item("noodles", "Noodles", ["noodles", "plain noodles", "面条", "面", "汤面"], 138, 225, "weight"),
  item("fried-noodles", "Fried Noodles", ["fried noodles", "chow mein", "炒面"], 190, 225, "weight"),
  item("tomato-egg-noodles", "Tomato Egg Noodles", ["tomato egg noodles", "西红柿鸡蛋面", "番茄鸡蛋面"], 125, 300, "weight"),
  item("fried-rice", "Fried Rice", ["fried rice", "egg fried rice", "炒饭", "蛋炒饭"], 175, 225, "weight"),
  item("yangzhou-fried-rice", "Yangzhou Fried Rice", ["yangzhou fried rice", "扬州炒饭"], 180, 225, "weight"),
  item("dumplings", "Dumplings", ["dumpling", "dumplings", "jiaozi", "饺子", "水饺"], 230, 250, "weight"),
  item("xiaolongbao", "Xiaolongbao", ["xiaolongbao", "soup dumpling", "小笼包", "小笼"], 235, 150, "unit"),
  item("baozi", "Baozi", ["baozi", "steamed bun", "包子"], 220, 100, "unit"),
  item("mantou", "Mantou", ["mantou", "steamed bread", "馒头"], 235, 100, "unit"),
  item("shaomai", "Shaomai", ["shaomai", "shumai", "烧麦", "烧卖"], 225, 120, "unit"),
  item("youtiao", "Youtiao", ["youtiao", "fried dough stick", "油条"], 388, 70, "unit"),
  item("soy-milk", "Soy Milk", ["soy milk", "soymilk", "豆浆"], 33, 300, "unit"),

  // Chinese dishes across common regional styles
  item("hong-shao-rou", "Braised Pork Belly", ["braised pork belly", "red braised pork", "红烧肉"], 395, 225, "weight"),
  item("dongpo-pork", "Dongpo Pork", ["dongpo pork", "东坡肉"], 430, 225, "weight"),
  item("kung-pao-chicken", "Kung Pao Chicken", ["kung pao chicken", "kungpao chicken", "宫保鸡丁"], 190, 225, "weight"),
  item("yu-xiang-pork", "Yu Xiang Shredded Pork", ["yu xiang pork", "fish fragrant pork", "鱼香肉丝"], 185, 225, "weight"),
  item("mapo-tofu", "Mapo Tofu", ["mapo tofu", "麻婆豆腐"], 145, 225, "weight"),
  item("twice-cooked-pork", "Twice Cooked Pork", ["twice cooked pork", "回锅肉"], 260, 225, "weight"),
  item("boiled-beef", "Sichuan Boiled Beef", ["sichuan boiled beef", "boiled beef", "水煮牛肉"], 190, 225, "weight"),
  item("tomato-egg", "Tomato Egg", ["tomato egg", "tomato scrambled egg", "西红柿炒蛋", "番茄炒蛋"], 115, 225, "weight"),
  item("green-pepper-pork", "Green Pepper Shredded Pork", ["green pepper pork", "青椒肉丝"], 160, 225, "weight"),
  item("braised-fish", "Braised Fish", ["braised fish", "red braised fish", "红烧鱼"], 170, 225, "weight"),
  item("steamed-fish", "Steamed Fish", ["steamed fish", "清蒸鱼"], 130, 225, "weight"),
  item("sweet-sour-ribs", "Sweet and Sour Ribs", ["sweet and sour ribs", "糖醋排骨"], 315, 225, "weight"),
  item("white-cut-chicken", "White Cut Chicken", ["white cut chicken", "白切鸡", "白斩鸡"], 185, 225, "weight"),
  item("char-siu", "Char Siu", ["char siu", "bbq pork", "叉烧"], 280, 225, "weight"),
  item("roast-duck", "Roast Duck", ["roast duck", "烧鸭", "烤鸭"], 337, 225, "weight"),
  item("hotpot", "Hotpot", ["hotpot", "hot pot", "火锅"], 160, 375, "weight"),
  item("hot-sour-potato", "Hot and Sour Shredded Potato", ["hot and sour potato", "酸辣土豆丝"], 110, 225, "weight"),
  item("stir-fried-greens", "Stir Fried Greens", ["stir fried greens", "vegetables", "greens", "炒青菜", "青菜", "蔬菜", "绿叶菜"], 70, 225, "weight"),
  item("sweet-sour-fish", "Sweet and Sour Fish", ["sweet and sour fish", "糖醋鱼"], 180, 225, "weight"),
  item("lion-head-meatball", "Lion's Head Meatball", ["lion head meatball", "狮子头", "红烧狮子头"], 260, 225, "weight"),
  item("beggar-chicken", "Beggar's Chicken", ["beggar chicken", "叫花鸡"], 220, 225, "weight"),
  item("dong-an-chicken", "Dong'an Chicken", ["dongan chicken", "东安子鸡", "东安鸡"], 190, 225, "weight"),
  item("stinky-mandarin-fish", "Stinky Mandarin Fish", ["stinky mandarin fish", "臭鳜鱼"], 160, 225, "weight"),
  item("buddha-jumps-wall", "Buddha Jumps Over The Wall", ["buddha jumps over the wall", "佛跳墙"], 150, 225, "weight"),
  item("longjing-shrimp", "Longjing Shrimp", ["longjing shrimp", "龙井虾仁"], 120, 225, "weight"),

  // Western foods
  item("hamburger", "Hamburger", ["hamburger", "burger", "cheeseburger", "汉堡", "汉堡包"], 260, 180, "unit"),
  item("pizza", "Pizza", ["pizza", "披萨", "比萨"], 266, 120, "unit"),
  item("pasta", "Pasta", ["pasta", "spaghetti", "意面", "意大利面"], 157, 225, "weight"),
  item("steak", "Beef Steak", ["steak", "beef steak", "牛排"], 250, 225, "weight"),
  item("chicken-breast", "Chicken Breast", ["chicken breast", "grilled chicken", "鸡胸肉", "烤鸡胸"], 165, 225, "weight"),
  item("sandwich", "Sandwich", ["sandwich", "三明治"], 240, 180, "unit"),
  item("salad", "Salad", ["salad", "green salad", "沙拉", "蔬菜沙拉"], 80, 225, "weight"),
  item("fries", "Fries", ["fries", "french fries", "薯条"], 312, 125, "unit"),
  item("oatmeal", "Oatmeal", ["oatmeal", "oats", "燕麦", "燕麦粥"], 68, 300, "unit"),
  item("bread", "Bread", ["bread", "toast", "sliced bread", "面包", "吐司"], 265, 35, "unit"),
  item("yogurt", "Yogurt", ["yogurt", "plain yogurt", "酸奶"], 72, 180, "unit"),
  item("milk", "Milk", ["milk", "whole milk", "牛奶"], 61, 250, "unit"),
  item("cheese", "Cheese", ["cheese", "奶酪", "芝士"], 350, 30, "unit"),
  item("cereal", "Cereal", ["cereal", "breakfast cereal", "麦片", "谷物麦片"], 370, 40, "unit"),
  item("fried-chicken", "Fried Chicken", ["fried chicken", "炸鸡"], 290, 180, "unit"),

  // Simple foods, fruit, vegetables
  item("egg", "Egg", ["egg", "eggs", "boiled egg", "鸡蛋", "水煮蛋", "煮鸡蛋"], 155, 50, "unit"),
  item("fried-egg", "Fried Egg", ["fried egg", "煎蛋", "荷包蛋"], 200, 60, "unit"),
  item("apple", "Apple", ["apple", "苹果"], 52, 180, "unit"),
  item("banana", "Banana", ["banana", "香蕉"], 89, 120, "unit"),
  item("orange", "Orange", ["orange", "橙子", "橘子"], 47, 160, "unit"),
  item("grape", "Grapes", ["grape", "grapes", "葡萄"], 69, 150, "unit"),
  item("strawberry", "Strawberry", ["strawberry", "strawberries", "草莓"], 32, 150, "unit"),
  item("watermelon", "Watermelon", ["watermelon", "西瓜"], 30, 300, "unit"),
  item("pear", "Pear", ["pear", "梨", "雪梨"], 57, 180, "unit"),
  item("peach", "Peach", ["peach", "桃子"], 39, 150, "unit"),
  item("avocado", "Avocado", ["avocado", "牛油果", "鳄梨"], 160, 150, "unit"),
  item("tomato", "Tomato", ["tomato", "番茄", "西红柿"], 18, 150, "unit"),
  item("cucumber", "Cucumber", ["cucumber", "黄瓜"], 15, 150, "unit"),
  item("broccoli", "Broccoli", ["broccoli", "西兰花"], 35, 225, "weight"),
  item("spinach", "Spinach", ["spinach", "菠菜"], 23, 225, "weight"),
  item("lettuce", "Lettuce", ["lettuce", "生菜"], 15, 150, "unit"),
  item("carrot", "Carrot", ["carrot", "胡萝卜"], 41, 150, "unit"),
  item("potato", "Potato", ["potato", "土豆", "马铃薯"], 77, 225, "weight"),
  item("sweet-potato", "Sweet Potato", ["sweet potato", "yam", "红薯", "地瓜"], 86, 180, "unit"),
  item("corn", "Corn", ["corn", "玉米"], 96, 160, "unit"),
  item("tofu", "Tofu", ["tofu", "bean curd", "豆腐"], 80, 225, "weight"),
];

function item(
  id: string,
  name: string,
  aliases: string[],
  kcalPer100g: number,
  defaultServingGrams: number,
  portionMode: PortionMode,
): FoodReferenceItem {
  return { id, name, aliases, kcalPer100g, defaultServingGrams, portionMode };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[，。；;、,.!！?？()（）[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function stripPortionWords(text: string) {
  return text
    .replace(/\b(small|medium|large)\b/g, " ")
    .replace(/[小中大](份|碗|盘|杯|个|勺)?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMultipleFoodSignal(text: string) {
  const normalized = normalizeText(text);
  const compact = compactText(text);
  const standaloneMatches = standaloneFoodWords.filter((word) =>
    new RegExp(`\\b${word}\\b`).test(normalized),
  );
  if (/\b(and|with|plus)\b/.test(normalized) || /[+&/]/.test(text)) return true;
  if (standaloneMatches.length > 1) return true;
  if (/[，,、]/.test(text)) return true;
  if (compact.includes("和") || compact.includes("以及") || compact.includes("配")) return true;
  return false;
}

function findMatchedFoods(description: string) {
  const normalized = normalizeText(stripPortionWords(description));
  const compact = compactText(stripPortionWords(description));
  const matches = new Set<string>();

  for (const food of foodReferenceLibrary) {
    for (const alias of food.aliases) {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);
      if (!normalizedAlias || !compactAlias) continue;

      if (normalized === normalizedAlias || compact === compactAlias) {
        matches.add(food.id);
        break;
      }

      if (normalized.includes(normalizedAlias) || compact.includes(compactAlias)) {
        matches.add(food.id);
        break;
      }
    }
  }

  return matches;
}

function findFood(description: string) {
  const normalized = normalizeText(stripPortionWords(description));
  const compact = compactText(stripPortionWords(description));

  let best: { food: FoodReferenceItem; score: number } | null = null;

  for (const food of foodReferenceLibrary) {
    for (const alias of food.aliases) {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);
      let score = 0;

      if (normalized === normalizedAlias || compact === compactAlias) {
        score = 1000 + compactAlias.length;
      } else if (normalized.includes(normalizedAlias) || compact.includes(compactAlias)) {
        score = 500 + compactAlias.length;
      }

      if (score > (best?.score ?? 0)) {
        best = { food, score };
      }
    }
  }

  return best?.food ?? null;
}

function normalizePortionSize(value: MealEstimateInput["portionSize"]): PortionSize {
  return value === "small" || value === "large" ? value : "medium";
}

function estimateGrams(food: FoodReferenceItem, portionSize: PortionSize) {
  if (food.portionMode === "unit") {
    return food.defaultServingGrams;
  }

  return portionGrams[portionSize];
}

export function estimateMealCalories(input: MealEstimateInput): MealEstimateResult {
  const rawDescription = String(input.foodDescription ?? "").trim();
  if (!rawDescription) {
    return { matched: false, reason: "empty", message: "Food name is required." };
  }

  if (hasMultipleFoodSignal(rawDescription)) {
    return {
      matched: false,
      reason: "multiple_foods",
      message: "Please enter one food at a time.",
    };
  }

  if (findMatchedFoods(rawDescription).size > 1) {
    return {
      matched: false,
      reason: "multiple_foods",
      message: "Please enter one food at a time.",
    };
  }

  const food = findFood(rawDescription);
  if (!food) {
    return {
      matched: false,
      reason: "not_found",
      message: "Food not found. Please enter calories manually.",
    };
  }

  const portionSize = normalizePortionSize(input.portionSize);
  const grams = estimateGrams(food, portionSize);
  const calories = Math.round((food.kcalPer100g * grams) / 100);

  return {
    matched: true,
    food,
    displayName: food.name,
    portionSize,
    portionMode: food.portionMode,
    grams,
    calories,
  };
}

export async function estimateMealFromImage(_imageFile: File) {
  void _imageFile;
  return {
    matched: false as const,
    reason: "not_found" as const,
    message: "Photo recognition is not implemented yet.",
  };
}
