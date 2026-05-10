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
  "tomato",
  "cucumber",
  "noodles",
  "wonton",
  "soup",
  "shrimp",
  "duck",
  "lamb",
  "milk",
  "tea",
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
  item("rice-noodle", "Rice Noodles", ["rice noodles", "rice noodle", "米粉", "米线"], 115, 300, "weight"),
  item("rice-roll", "Rice Roll", ["rice roll", "cheung fun", "肠粉"], 120, 250, "weight"),
  item("ho-fun", "Ho Fun", ["ho fun", "rice noodles roll", "河粉", "炒河粉"], 170, 225, "weight"),
  item("lanzhou-noodles", "Lanzhou Beef Noodles", ["lanzhou noodles", "lanzhou beef noodles", "兰州拉面", "牛肉面"], 125, 350, "weight"),
  item("ramen", "Ramen", ["ramen", "日式拉面", "拉面"], 135, 350, "weight"),
  item("wonton", "Wonton", ["wonton", "wonton soup", "馄饨", "云吞", "抄手"], 160, 250, "weight"),
  item("hot-sour-noodles", "Hot and Sour Noodles", ["hot and sour noodles", "酸辣粉"], 160, 300, "weight"),
  item("luosifen", "Luosifen", ["luosifen", "螺蛳粉"], 170, 350, "weight"),
  item("malatang", "Malatang", ["malatang", "spicy hot pot", "麻辣烫"], 145, 375, "weight"),
  item("jianbing", "Jianbing", ["jianbing", "chinese crepe", "煎饼果子", "煎饼"], 240, 180, "unit"),
  item("cold-noodles", "Cold Noodles", ["cold noodles", "凉面", "冷面"], 155, 300, "weight"),
  item("liangpi", "Liangpi", ["liangpi", "cold skin noodles", "凉皮"], 150, 300, "weight"),
  item("roujiamo", "Roujiamo", ["roujiamo", "chinese burger", "肉夹馍"], 260, 180, "unit"),
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
  item("huangmen-chicken", "Huangmen Chicken", ["huangmen chicken", "braised chicken rice", "黄焖鸡", "黄焖鸡米饭"], 170, 300, "weight"),
  item("chicken-rice-bowl", "Chicken Rice Bowl", ["chicken rice bowl", "chicken leg rice", "鸡腿饭", "鸡肉饭", "照烧鸡饭"], 165, 350, "weight"),
  item("beef-rice-bowl", "Beef Rice Bowl", ["beef rice bowl", "牛肉饭", "肥牛饭"], 170, 350, "weight"),
  item("pork-rice-bowl", "Pork Rice Bowl", ["pork rice bowl", "卤肉饭", "猪肉饭"], 190, 350, "weight"),
  item("claypot-rice", "Claypot Rice", ["claypot rice", "煲仔饭"], 180, 350, "weight"),
  item("curry-chicken-rice", "Curry Chicken Rice", ["curry chicken rice", "咖喱鸡饭", "咖喱饭"], 165, 350, "weight"),
  item("yu-xiang-pork", "Yu Xiang Shredded Pork", ["yu xiang pork", "fish fragrant pork", "鱼香肉丝"], 185, 225, "weight"),
  item("mapo-tofu", "Mapo Tofu", ["mapo tofu", "麻婆豆腐"], 145, 225, "weight"),
  item("twice-cooked-pork", "Twice Cooked Pork", ["twice cooked pork", "回锅肉"], 260, 225, "weight"),
  item("boiled-beef", "Sichuan Boiled Beef", ["sichuan boiled beef", "boiled beef", "水煮牛肉"], 190, 225, "weight"),
  item("boiled-fish", "Sichuan Boiled Fish", ["sichuan boiled fish", "boiled fish", "水煮鱼"], 160, 225, "weight"),
  item("spicy-chicken", "Spicy Chicken", ["spicy chicken", "辣子鸡"], 260, 225, "weight"),
  item("cumin-lamb", "Cumin Lamb", ["cumin lamb", "孜然羊肉"], 240, 225, "weight"),
  item("stir-fried-beef", "Stir Fried Beef", ["stir fried beef", "小炒牛肉", "炒牛肉"], 210, 225, "weight"),
  item("shredded-potato", "Shredded Potato", ["shredded potato", "土豆丝", "炒土豆丝"], 105, 225, "weight"),
  item("tomato-egg", "Tomato Egg", ["tomato egg", "tomato scrambled egg", "西红柿炒蛋", "番茄炒蛋"], 115, 225, "weight"),
  item("eggplant-garlic", "Garlic Eggplant", ["garlic eggplant", "鱼香茄子", "蒜蓉茄子", "茄子"], 125, 225, "weight"),
  item("dry-pot-cauliflower", "Dry Pot Cauliflower", ["dry pot cauliflower", "干锅花菜", "干锅菜花"], 145, 225, "weight"),
  item("scrambled-egg", "Scrambled Egg", ["scrambled egg", "scrambled eggs", "炒鸡蛋"], 200, 225, "weight"),
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
  item("shrimp", "Shrimp", ["shrimp", "prawn", "虾", "虾仁"], 100, 225, "weight"),
  item("stir-fried-cabbage", "Stir Fried Cabbage", ["stir fried cabbage", "手撕包菜", "炒包菜", "包菜"], 85, 225, "weight"),
  item("hot-sour-soup", "Hot and Sour Soup", ["hot and sour soup", "酸辣汤"], 45, 300, "weight"),
  item("egg-drop-soup", "Egg Drop Soup", ["egg drop soup", "紫菜蛋花汤", "蛋花汤"], 35, 300, "weight"),
  item("corn-soup", "Corn Soup", ["corn soup", "玉米汤"], 55, 300, "weight"),

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
  item("chicken-nuggets", "Chicken Nuggets", ["chicken nuggets", "nuggets", "鸡块", "麦乐鸡"], 295, 120, "unit"),
  item("hot-dog", "Hot Dog", ["hot dog", "热狗"], 290, 150, "unit"),
  item("lasagna", "Lasagna", ["lasagna", "千层面"], 165, 225, "weight"),
  item("burrito", "Burrito", ["burrito", "墨西哥卷饼"], 220, 250, "unit"),
  item("taco", "Taco", ["taco", "塔可"], 225, 120, "unit"),
  item("sushi", "Sushi", ["sushi", "寿司"], 150, 200, "weight"),

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
  item("bok-choy", "Bok Choy", ["bok choy", "小白菜", "上海青", "油菜"], 18, 225, "weight"),
  item("cabbage", "Cabbage", ["cabbage", "卷心菜", "包菜", "白菜"], 25, 225, "weight"),
  item("lettuce", "Lettuce", ["lettuce", "生菜"], 15, 150, "unit"),
  item("carrot", "Carrot", ["carrot", "胡萝卜"], 41, 150, "unit"),
  item("mushroom", "Mushroom", ["mushroom", "mushrooms", "蘑菇", "香菇", "金针菇"], 30, 225, "weight"),
  item("cauliflower", "Cauliflower", ["cauliflower", "花菜", "菜花"], 25, 225, "weight"),
  item("winter-melon", "Winter Melon", ["winter melon", "冬瓜"], 13, 225, "weight"),
  item("pumpkin", "Pumpkin", ["pumpkin", "南瓜"], 26, 225, "weight"),
  item("eggplant", "Eggplant", ["eggplant", "aubergine", "茄子"], 25, 225, "weight"),
  item("potato", "Potato", ["potato", "土豆", "马铃薯"], 77, 225, "weight"),
  item("sweet-potato", "Sweet Potato", ["sweet potato", "yam", "红薯", "地瓜"], 86, 180, "unit"),
  item("corn", "Corn", ["corn", "玉米"], 96, 160, "unit"),
  item("tofu", "Tofu", ["tofu", "bean curd", "豆腐"], 80, 225, "weight"),
  item("edamame", "Edamame", ["edamame", "毛豆"], 122, 150, "unit"),
  item("peanut", "Peanuts", ["peanut", "peanuts", "花生"], 567, 30, "unit"),
  item("almond", "Almonds", ["almond", "almonds", "杏仁"], 579, 30, "unit"),
  item("cashew", "Cashews", ["cashew", "cashews", "腰果"], 553, 30, "unit"),
  item("black-coffee", "Black Coffee", ["black coffee", "americano", "美式咖啡", "黑咖啡"], 2, 300, "unit"),
  item("latte", "Latte", ["latte", "拿铁", "拿铁咖啡"], 45, 350, "unit"),
  item("milk-tea", "Milk Tea", ["milk tea", "bubble tea", "奶茶", "珍珠奶茶"], 65, 500, "unit"),
  item("cola", "Cola", ["cola", "coke", "可乐"], 42, 330, "unit"),
  item("orange-juice", "Orange Juice", ["orange juice", "橙汁"], 45, 300, "unit"),
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
  const matches: Array<{ id: string; exact: boolean }> = [];

  for (const food of foodReferenceLibrary) {
    for (const alias of food.aliases) {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);
      if (!normalizedAlias || !compactAlias) continue;

      if (normalized === normalizedAlias || compact === compactAlias) {
        matches.push({ id: food.id, exact: true });
        break;
      }

      if (normalized.includes(normalizedAlias) || compact.includes(compactAlias)) {
        matches.push({ id: food.id, exact: false });
        break;
      }
    }
  }

  const exactMatches = matches.filter((match) => match.exact);
  return new Set((exactMatches.length ? exactMatches : matches).map((match) => match.id));
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
