/* Penny – seed data and constants. Loaded first; defines the global Penny namespace. */
window.Penny = window.Penny || {};

(function (P) {
  'use strict';

  // Registries that other modules add to. app.js dispatches clicks and form submits to them.
  P.actions = {};
  P.forms = {};

  P.CATEGORIES = ['Meat & fish', 'Dairy & eggs', 'Fruit & veg', 'Bakery', 'Cupboard', 'Frozen'];
  P.CATEGORY_EMOJI = {
    'Meat & fish': '🍗', 'Dairy & eggs': '🥛', 'Fruit & veg': '🥦',
    'Bakery': '🍞', 'Cupboard': '🥫', 'Frozen': '❄️'
  };
  P.STORAGE = ['Fridge', 'Freezer', 'Cupboard'];
  P.UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'tins', 'slices', 'pack', 'bulb'];

  // Days from purchase used to estimate expiry for synced items.
  P.EXPIRY_RULES = {
    'fresh meat': 2, 'fish': 2, 'salad leaves': 3, 'soft fruit': 4, 'bread': 5,
    'vegetables': 7, 'milk': 7, 'yoghurt': 7, 'cheese': 21, 'eggs': 21
  };

  P.DIETS = [
    { id: 'none', label: 'No restrictions' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' }
  ];

  // Allergen keywords are matched against ingredient names at the start of a word.
  P.ALLERGENS = [
    { id: 'gluten', label: 'Gluten', words: ['flour', 'bread', 'penne', 'pasta', 'spaghetti', 'wrap', 'soy sauce', 'noodle', 'tortilla', 'granola', 'oats', 'couscous'] },
    { id: 'dairy', label: 'Dairy', words: ['milk', 'cheese', 'cheddar', 'yoghurt', 'yogurt', 'butter', 'cream', 'parmesan', 'feta', 'mozzarella'] },
    { id: 'eggs', label: 'Eggs', words: ['egg'] },
    { id: 'nuts', label: 'Tree nuts', words: ['almond', 'cashew', 'walnut', 'hazelnut', 'pecan', 'pistachio'] },
    { id: 'peanuts', label: 'Peanuts', words: ['peanut'] },
    { id: 'fish', label: 'Fish', words: ['salmon', 'tuna', 'cod', 'fish', 'haddock', 'mackerel'] },
    { id: 'shellfish', label: 'Shellfish', words: ['prawn', 'shrimp', 'crab', 'mussel'] },
    { id: 'soy', label: 'Soy', words: ['soy', 'tofu', 'edamame'] },
    { id: 'sesame', label: 'Sesame', words: ['sesame', 'tahini'] }
  ];
  P.MEAT_WORDS = ['chicken', 'beef', 'mince', 'pork', 'bacon', 'ham', 'lamb', 'sausage', 'turkey', 'chorizo',
    'salmon', 'tuna', 'cod', 'fish', 'haddock', 'mackerel', 'prawn', 'shrimp', 'anchov'];
  P.ANIMAL_WORDS = ['milk', 'cheese', 'cheddar', 'yoghurt', 'yogurt', 'butter', 'cream', 'egg', 'honey', 'parmesan', 'feta', 'mozzarella'];

  // Basic seasonings everyone is assumed to have; never counted as missing.
  P.STAPLES = ['salt', 'black pepper', 'pepper', 'salt and pepper', 'water', 'mixed herbs', 'dried herbs',
    'paprika', 'cumin', 'chilli flakes', 'sugar'];

  // Rough UK supermarket prices used to cost missing ingredients on user-uploaded recipes.
  P.PRICE_GUESS = [
    ['chicken', 3.0], ['beef', 3.5], ['mince', 3.5], ['salmon', 3.5], ['fish', 3.0], ['prawn', 3.0],
    ['egg', 1.5], ['milk', 1.1], ['cheddar', 2.0], ['cheese', 2.0], ['yoghurt', 1.2], ['butter', 1.8], ['cream', 1.1],
    ['bread', 1.0], ['wrap', 1.2], ['tortilla', 1.2], ['pasta', 0.8], ['penne', 0.8], ['spaghetti', 0.7], ['noodle', 0.9],
    ['rice', 1.0], ['flour', 0.85], ['oats', 0.9], ['onion', 0.2], ['garlic', 0.3], ['tomato', 0.9], ['potato', 1.0],
    ['carrot', 0.5], ['pepper', 0.7], ['mushroom', 1.0], ['spinach', 1.0], ['banana', 0.2], ['broccoli', 0.7],
    ['lemon', 0.4], ['lime', 0.3], ['avocado', 0.9], ['chickpea', 0.65], ['bean', 0.6], ['lentil', 0.9],
    ['stock', 0.9], ['curry paste', 1.5], ['soy sauce', 0.9], ['oil', 1.5], ['honey', 1.2], ['cucumber', 0.6]
  ];

  // Inline SVG icons used in templates.
  // Image icons supplied for the demo (in /img).
  P.IMG = {
    alarm: function (cls) { return '<img class="' + (cls || 'alert-ico') + '" src="img/alarm.png" alt="">'; },
    bell: function (cls) { return '<img class="' + (cls || 'alert-ico') + '" src="img/bell.png" alt="">'; },
    nectar: function (cls) { return '<img class="' + (cls || 'nectar-logo') + '" src="img/nectar.png" alt="Nectar">'; },
    recime: function (cls) { return '<img class="' + (cls || 'recime-logo') + '" src="img/recime.png" alt="ReciMe">'; }
  };
  P.ICONS = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.3 3 4.2 6.2C19.5 15.4 12 20 12 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5h0a1.5 1.5 0 0 1-1.5-1.5v-8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-5-3.5L7 20V4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M2.5 10h19" stroke="#fff" stroke-width="1.8"/><path d="M6 14.5h4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ---------- Starting inventory (23 items) ----------
     [name, category, storage, quantity, unit, daysUntilExpiry, dateType, opened, boughtDaysAgo] */
  P.SEED_INVENTORY = [
    ['Chicken breast', 'Meat & fish', 'Fridge', 300, 'g', 1, 'use-by', false, 2],
    ['Baby spinach', 'Fruit & veg', 'Fridge', 80, 'g', 1, 'use-by', true, 3],
    ['Natural yoghurt', 'Dairy & eggs', 'Fridge', 150, 'g', 2, 'use-by', true, 5],
    ['Beef mince', 'Meat & fish', 'Fridge', 500, 'g', 2, 'use-by', false, 1],
    ['Semi-skimmed milk', 'Dairy & eggs', 'Fridge', 0.5, 'L', 3, 'use-by', true, 4],
    ['Mushrooms', 'Fruit & veg', 'Fridge', 250, 'g', 3, 'best-before', false, 3],
    ['Bananas', 'Fruit & veg', 'Cupboard', 3, 'pcs', 3, 'best-before', false, 4],
    ['Sliced bread', 'Bakery', 'Cupboard', 6, 'slices', 3, 'best-before', true, 3],
    ['Tomatoes', 'Fruit & veg', 'Fridge', 4, 'pcs', 4, 'best-before', false, 3],
    ['Bell peppers', 'Fruit & veg', 'Fridge', 2, 'pcs', 5, 'best-before', false, 3],
    ['Eggs', 'Dairy & eggs', 'Fridge', 6, 'pcs', 11, 'best-before', false, 6],
    ['Carrots', 'Fruit & veg', 'Fridge', 500, 'g', 13, 'best-before', false, 4],
    ['Cheddar', 'Dairy & eggs', 'Fridge', 120, 'g', 16, 'best-before', true, 10],
    ['Garlic', 'Fruit & veg', 'Cupboard', 1, 'bulb', 19, 'best-before', false, 8],
    ['Onions', 'Fruit & veg', 'Cupboard', 3, 'pcs', 21, 'best-before', false, 6],
    ['Potatoes', 'Fruit & veg', 'Cupboard', 1.5, 'kg', 26, 'best-before', false, 4],
    ['Frozen peas', 'Frozen', 'Freezer', 300, 'g', 200, 'best-before', true, 40],
    ['Penne', 'Cupboard', 'Cupboard', 500, 'g', 205, 'best-before', false, 30],
    ['Soy sauce', 'Cupboard', 'Cupboard', 100, 'ml', 270, 'best-before', true, 60],
    ['Rice', 'Cupboard', 'Cupboard', 1, 'kg', 310, 'best-before', false, 45],
    ['Chickpeas (tin)', 'Cupboard', 'Cupboard', 1, 'tins', 330, 'best-before', false, 30],
    ['Olive oil', 'Cupboard', 'Cupboard', 200, 'ml', 340, 'best-before', true, 50],
    ['Chopped tomatoes (tins)', 'Cupboard', 'Cupboard', 2, 'tins', 420, 'best-before', false, 30]
  ];

  /* ---------- Mock Sainsbury's basket (12 items) ----------
     rule: key into EXPIRY_RULES (estimated); packDays: fixed date printed on the pack. */
  P.SEED_BASKET = [
    { name: 'Chicken thighs', category: 'Meat & fish', storage: 'Fridge', quantity: 500, unit: 'g', rule: 'fresh meat', dateType: 'use-by', price: 3.25 },
    { name: 'Salad bag', category: 'Fruit & veg', storage: 'Fridge', quantity: 120, unit: 'g', rule: 'salad leaves', dateType: 'use-by', price: 1.00 },
    { name: 'Salmon fillets', category: 'Meat & fish', storage: 'Fridge', quantity: 2, unit: 'pcs', rule: 'fish', dateType: 'use-by', price: 4.25 },
    { name: 'Strawberries', category: 'Fruit & veg', storage: 'Fridge', quantity: 400, unit: 'g', rule: 'soft fruit', dateType: 'best-before', price: 2.50 },
    { name: 'Semi-skimmed milk', category: 'Dairy & eggs', storage: 'Fridge', quantity: 1.1, unit: 'L', rule: 'milk', dateType: 'use-by', price: 1.15 },
    { name: 'Greek yoghurt', category: 'Dairy & eggs', storage: 'Fridge', quantity: 500, unit: 'g', rule: 'yoghurt', dateType: 'use-by', price: 1.75 },
    { name: 'Wholemeal wraps', category: 'Bakery', storage: 'Cupboard', quantity: 8, unit: 'pcs', rule: 'bread', dateType: 'best-before', price: 1.30 },
    { name: 'Broccoli', category: 'Fruit & veg', storage: 'Fridge', quantity: 1, unit: 'pcs', rule: 'vegetables', dateType: 'best-before', price: 0.69 },
    { name: 'Red onions', category: 'Fruit & veg', storage: 'Cupboard', quantity: 3, unit: 'pcs', rule: 'vegetables', dateType: 'best-before', price: 0.85 },
    { name: 'Cherry tomatoes', category: 'Fruit & veg', storage: 'Fridge', quantity: 250, unit: 'g', rule: 'vegetables', dateType: 'best-before', price: 1.10 },
    { name: 'Mature cheddar', category: 'Dairy & eggs', storage: 'Fridge', quantity: 400, unit: 'g', rule: 'cheese', dateType: 'best-before', price: 3.50 },
    { name: 'Basmati rice', category: 'Cupboard', storage: 'Cupboard', quantity: 1, unit: 'kg', packDays: 540, dateType: 'best-before', price: 2.20 }
  ];

  /* ---------- Community users (fictional) ---------- */
  P.SEED_USERS = {
    u1: { id: 'u1', name: 'Aisha K.', color: '#D9653B' },
    u2: { id: 'u2', name: 'Tom B.', color: '#3D7EA6' },
    u3: { id: 'u3', name: 'Mei L.', color: '#8B5CB8' }
  };

  function ing(name, amount, cost) { return { name: name, amount: amount, cost: cost }; }

  /* ---------- Recipes: 2 of the user's own + 6 public community recipes ---------- */
  P.SEED_RECIPES = [
    {
      id: 'r-me-1', authorId: 'me', title: 'Creamy chicken & spinach pasta', emoji: '🍝', color: '#F6E3C8',
      ingredients: [ing('Chicken', '2 breasts', 3.00), ing('Spinach', '2 handfuls', 1.00), ing('Penne', '200 g', 0.80),
        ing('Garlic', '2 cloves', 0.30), ing('Milk', '200 ml', 0.60), ing('Cheddar', '50 g', 1.00), ing('Black pepper', 'to taste', 0)],
      steps: ['Boil the penne in salted water for 10–11 minutes.', 'Slice the chicken and fry in a little oil until golden and cooked through.',
        'Add the garlic for 1 minute, then pour in the milk and grate in the cheddar.', 'Stir in the spinach until wilted, then toss with the drained pasta.'],
      timeMinutes: 25, servings: 2, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u1', 'u3'], hoursAgo: 70
    },
    {
      id: 'r-me-2', authorId: 'me', title: 'Banana pancakes', emoji: '🥞', color: '#FBEBC4',
      ingredients: [ing('Bananas', '2 ripe', 0.40), ing('Eggs', '2', 0.50), ing('Milk', '50 ml', 0.20),
        ing('Self-raising flour', '60 g', 0.85), ing('Olive oil', '1 tsp', 0.10)],
      steps: ['Mash the bananas in a bowl.', 'Whisk in the eggs, milk and flour until smooth.',
        'Heat a little oil in a pan and cook small pancakes for 2 minutes each side.'],
      timeMinutes: 15, servings: 2, image: '', visibility: 'private', source: 'penny', sourcePlatform: null,
      likes: [], hoursAgo: 150
    },
    {
      id: 'r-c-1', authorId: 'u3', title: 'Mushroom & spinach omelette', emoji: '🍳', color: '#FFF1C9',
      ingredients: [ing('Eggs', '3', 0.75), ing('Mushrooms', '100 g', 0.60), ing('Spinach', '1 handful', 1.00),
        ing('Cheddar', '30 g', 0.60), ing('Olive oil', '1 tsp', 0.10), ing('Salt and pepper', 'to taste', 0)],
      steps: ['Slice the mushrooms and fry in the oil for 4 minutes.', 'Add the spinach and let it wilt.',
        'Pour in the beaten eggs, sprinkle over the cheddar and cook until just set.', 'Fold in half and serve.'],
      timeMinutes: 10, servings: 1, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u1', 'u2', 'u4', 'u5'], hoursAgo: 5
    },
    {
      id: 'r-c-2', authorId: 'u2', title: 'Student bolognese', emoji: '🍝', color: '#F8D7CC',
      ingredients: [ing('Beef mince', '500 g', 3.50), ing('Onions', '1', 0.20), ing('Garlic', '2 cloves', 0.30),
        ing('Carrots', '2', 0.30), ing('Chopped tomatoes', '2 tins', 1.10), ing('Spaghetti', '300 g', 0.70), ing('Mixed herbs', '1 tsp', 0)],
      steps: ['Finely chop the onion, garlic and carrots and soften in a pan for 5 minutes.', 'Add the mince and brown it all over.',
        'Pour in the tomatoes and herbs, then simmer for 25 minutes.', 'Cook the spaghetti and serve with the sauce. Freeze leftovers in portions.'],
      timeMinutes: 40, servings: 4, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u1', 'u3', 'u4', 'u5', 'u6'], hoursAgo: 28
    },
    {
      id: 'r-c-3', authorId: 'u1', title: 'One-pot chickpea curry', emoji: '🍛', color: '#FBE0B5',
      ingredients: [ing('Chickpeas', '1 tin', 0.65), ing('Onions', '1', 0.20), ing('Garlic', '2 cloves', 0.30),
        ing('Chopped tomatoes', '1 tin', 0.55), ing('Spinach', '2 handfuls', 1.00), ing('Curry paste', '2 tbsp', 1.50), ing('Rice', '200 g', 0.40)],
      steps: ['Fry the chopped onion and garlic until soft.', 'Stir in the curry paste for 1 minute.',
        'Add the chickpeas and tomatoes and simmer for 15 minutes.', 'Stir through the spinach and serve with rice.'],
      timeMinutes: 30, servings: 3, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u2', 'u3', 'u6'], hoursAgo: 52
    },
    {
      id: 'r-c-4', authorId: 'u2', title: 'Egg fried rice', emoji: '🍚', color: '#FDF0C2',
      ingredients: [ing('Rice', '200 g cooked', 0.40), ing('Eggs', '2', 0.50), ing('Frozen peas', '100 g', 0.80),
        ing('Soy sauce', '2 tbsp', 0.90), ing('Onions', '1', 0.20), ing('Carrots', '1', 0.15)],
      steps: ['Cook the rice and let it cool (day-old rice works best).', 'Fry the diced onion and carrot for 3 minutes.',
        'Add the rice and peas and stir-fry for 4 minutes.', 'Push to one side, scramble the eggs, then mix in with the soy sauce.'],
      timeMinutes: 15, servings: 2, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u1', 'u3', 'u4', 'u7'], hoursAgo: 12
    },
    {
      id: 'r-c-5', authorId: 'u1', title: 'Chicken fajita wraps', emoji: '🌯', color: '#F9D9C0',
      ingredients: [ing('Chicken', '300 g', 3.00), ing('Bell peppers', '2', 1.00), ing('Onions', '1', 0.20),
        ing('Wraps', '4', 1.20), ing('Yoghurt', '3 tbsp', 0.80), ing('Paprika', '1 tsp', 0)],
      steps: ['Slice the chicken, peppers and onion into strips.', 'Toss with paprika and fry on a high heat for 8–10 minutes.',
        'Warm the wraps, fill with the chicken and veg and top with yoghurt.'],
      timeMinutes: 20, servings: 2, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u2', 'u5'], hoursAgo: 80
    },
    {
      id: 'r-c-6', authorId: 'u3', title: 'Cheesy potato & veg bake', emoji: '🥔', color: '#F3E6C5',
      ingredients: [ing('Potatoes', '800 g', 1.00), ing('Broccoli', '1 head', 0.70), ing('Carrots', '2', 0.30),
        ing('Cheddar', '100 g', 1.50), ing('Milk', '300 ml', 0.40), ing('Onions', '1', 0.20)],
      steps: ['Slice the potatoes thinly and parboil for 5 minutes.', 'Chop the broccoli, carrots and onion.',
        'Layer the potatoes and veg in a dish, pour over the milk and top with cheddar.', 'Bake at 200°C for 35 minutes until golden.'],
      timeMinutes: 50, servings: 4, image: '', visibility: 'public', source: 'penny', sourcePlatform: null,
      likes: ['u1', 'u2', 'u7'], hoursAgo: 100
    }
  ];

  // One comment per public community recipe.
  P.SEED_COMMENTS = [
    { recipeId: 'r-c-1', authorId: 'u2', text: 'Made this for brunch, ready in 10 mins. So good!', minutesAgo: 140 },
    { recipeId: 'r-c-2', authorId: 'u1', text: 'Batch cooked this on Sunday and it lasted me three days 🙌', minutesAgo: 900 },
    { recipeId: 'r-c-3', authorId: 'u3', text: 'Added a spoon of yoghurt on top. Perfect for a cold night.', minutesAgo: 2100 },
    { recipeId: 'r-c-4', authorId: 'u3', text: 'Best way to use up leftover rice.', minutesAgo: 400 },
    { recipeId: 'r-c-5', authorId: 'u2', text: 'Tried with chicken thighs instead and it worked great.', minutesAgo: 3600 },
    { recipeId: 'r-c-6', authorId: 'u1', text: 'Comfort food on a budget. Saving this!', minutesAgo: 5200 }
  ];

  /* ---------- Recipe filters ---------- */
  P.CUISINES = ['British', 'Italian', 'Indian', 'Chinese', 'Japanese', 'Thai', 'Mexican', 'French', 'American',
    'Mediterranean', 'Middle Eastern', 'Other'];
  P.MEALS = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '🥪' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍪' }
  ];

  // Tags for seed and ReciMe recipes (cuisine, meal types, freezer-friendly, one pot, high protein).
  // Recipe photos from Wikimedia Commons (free licences; credits shown on each recipe page).
  P.RECIPE_IMAGES = {
    'r-me-1': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Creamy_spinach_pasta_%284463852122%29.jpg/960px-Creamy_spinach_pasta_%284463852122%29.jpg', credit: 'Karen and Brad Emerson', licence: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Creamy_spinach_pasta_(4463852122).jpg' },
    'r-me-2': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Nutella_Banana_Pancakes_-_Laughing_Dog_2026-08-25.jpg/960px-Nutella_Banana_Pancakes_-_Laughing_Dog_2026-08-25.jpg', credit: 'Andy Li', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Nutella_Banana_Pancakes_-_Laughing_Dog_2026-08-25.jpg' },
    'r-c-1': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Mushroom_Omelette_-_Breakfast_At_Tiffany%27s_Brighton.jpg/960px-Mushroom_Omelette_-_Breakfast_At_Tiffany%27s_Brighton.jpg', credit: 'Andy Li', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Mushroom_Omelette_-_Breakfast_At_Tiffany%27s_Brighton.jpg' },
    'r-c-2': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Spaghetti_bolognese_-_Enzo%27s_2026-04-21.jpg/960px-Spaghetti_bolognese_-_Enzo%27s_2026-04-21.jpg', credit: 'Andy Li', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Spaghetti_bolognese_-_Enzo%27s_2026-04-21.jpg' },
    'r-c-3': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Spinach-Chickpea_Curry_%283117324894%29.jpg/960px-Spinach-Chickpea_Curry_%283117324894%29.jpg', credit: 'Kari Sullivan from Austin, TX', licence: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Spinach-Chickpea_Curry_(3117324894).jpg' },
    'r-c-4': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Fried_rice_with_egg.jpg/960px-Fried_rice_with_egg.jpg', credit: 'ProjectManhattan', licence: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Fried_rice_with_egg.jpg' },
    'r-c-5': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Fajitas_Wraps.JPG/960px-Fajitas_Wraps.JPG', credit: 'Miansari66', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Fajitas_Wraps.JPG' },
    'r-c-6': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Gratin_4.jpg/960px-Gratin_4.jpg', credit: 'Wxao Zexw', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Gratin_4.jpg' },
    'r-x-1': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Salmon_bowl.jpg/960px-Salmon_bowl.jpg', credit: 'Janine', licence: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Salmon_bowl.jpg' },
    'r-x-2': { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Mushroom_on_Toast_-_The_Canopy_2025-06-08.jpg/960px-Mushroom_on_Toast_-_The_Canopy_2025-06-08.jpg', credit: 'Andy Li', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Mushroom_on_Toast_-_The_Canopy_2025-06-08.jpg' },
    'r-x-3': { url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Strawberries_%26_Yogurt.jpg', credit: 'Youmna9115', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Strawberries_%26_Yogurt.jpg' }
  };

  P.RECIPE_TAGS = {
    'r-me-1': { cuisine: 'Italian', meals: ['dinner'], freezer: false, onePot: false, highProtein: true },
    'r-me-2': { cuisine: 'American', meals: ['breakfast', 'snack'], freezer: true, onePot: false, highProtein: false },
    'r-c-1': { cuisine: 'French', meals: ['breakfast', 'lunch'], freezer: false, onePot: true, highProtein: true },
    'r-c-2': { cuisine: 'Italian', meals: ['dinner'], freezer: true, onePot: false, highProtein: true },
    'r-c-3': { cuisine: 'Indian', meals: ['lunch', 'dinner'], freezer: true, onePot: true, highProtein: false },
    'r-c-4': { cuisine: 'Chinese', meals: ['lunch', 'dinner'], freezer: false, onePot: true, highProtein: false },
    'r-c-5': { cuisine: 'Mexican', meals: ['lunch', 'dinner'], freezer: false, onePot: false, highProtein: true },
    'r-c-6': { cuisine: 'British', meals: ['dinner'], freezer: true, onePot: true, highProtein: false },
    'r-x-1': { cuisine: 'Japanese', meals: ['lunch', 'dinner'], freezer: false, onePot: false, highProtein: true },
    'r-x-2': { cuisine: 'British', meals: ['breakfast', 'lunch'], freezer: false, onePot: true, highProtein: false },
    'r-x-3': { cuisine: 'Mediterranean', meals: ['breakfast', 'snack'], freezer: false, onePot: false, highProtein: false }
  };

  /* ---------- Community events around Bristol (fictional hosts and venues) ----------
     weekday: 0 = Sunday … 6 = Saturday; the event falls on the first such day at least minOffset days after the demo start; hoursAgo: when the post was shared. */
  P.SEED_EVENTS = [
    {
      id: 'e-1', hostId: 'u3', title: 'Saturday leftovers swap', emoji: '🔄', color: '#E3F0D9',
      weekday: 6, minOffset: 1, start: '10:00', end: '13:00', venue: 'North Street pop-up stall', area: 'Bedminster',
      price: 0, capacity: 40, going: ['u1', 'u2', 'u4', 'u5', 'u6', 'u7', 'u8'],
      tags: ['Food waste', 'Free'],
      description: 'Bought too much? Bring your unopened surplus food and swap it for something you will actually eat. Anything left at 1pm goes to a local food bank.',
      hoursAgo: 20
    },
    {
      id: 'e-2', hostId: 'u1', title: 'Sunday batch-cook & share', emoji: '🥘', color: '#FBE0B5',
      weekday: 0, minOffset: 2, start: '12:00', end: '15:00', venue: 'The Long Table community kitchen', area: 'Stokes Croft',
      price: 0, capacity: 20, going: ['u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10', 'u11', 'u12'],
      tags: ['Cook together', 'Bring one veg'],
      description: 'We cook three big pots (a curry, a soup and a pasta bake) from whatever veg people bring, then everyone takes home a week of lunches. Bring one vegetable and a tub.',
      hoursAgo: 9
    },
    {
      id: 'e-3', hostId: 'u2', title: 'Pay-what-you-can student supper', emoji: '🍲', color: '#F8D7CC',
      weekday: 3, minOffset: 3, start: '18:30', end: '20:30', venue: 'Cotham Parish Hall', area: 'Cotham',
      price: 3, capacity: 30, going: ['u1', 'u4', 'u6', 'u9', 'u13'],
      tags: ['Students', 'Suggested £3'],
      description: 'A two-course veggie dinner cooked with surplus food from local shops. Suggested £3, but pay what you can. Come hungry and meet other students.',
      hoursAgo: 30
    },
    {
      id: 'e-4', hostId: 'u3', title: 'Dumpling-making night', emoji: '🥟', color: '#FFF1C9',
      weekday: 5, minOffset: 6, start: '19:00', end: '21:00', venue: 'Easton Community Centre', area: 'Easton',
      price: 5, capacity: 12, going: ['u1', 'u2', 'u5', 'u7', 'u8', 'u10', 'u11', 'u12', 'u14'],
      tags: ['Workshop', 'Beginners welcome'],
      description: 'Learn to fold dumplings from scratch with a filling that uses up cabbage, carrots and spring onions. Ingredients included; eat what you make.',
      hoursAgo: 50
    }
  ];

  P.SEED_EVENT_COMMENTS = [
    { recipeId: 'e-2', authorId: 'u2', text: 'Bringing a squash and a big tub. Last month’s curry was unreal.', minutesAgo: 300 },
    { recipeId: 'e-4', authorId: 'u1', text: 'Is it OK to come on my own? Never made dumplings before!', minutesAgo: 1500 },
    { recipeId: 'e-4', authorId: 'u3', text: 'Of course! Most people come solo. 😊', minutesAgo: 1400 }
  ];

  /* ---------- Mock ReciMe imports (saved from social media) ---------- */
  P.RECIME_RECIPES = [
    {
      id: 'r-x-1', title: 'Viral salmon rice bowl', emoji: '🍣', color: '#FCD9CF', sourcePlatform: 'TikTok',
      ingredients: [ing('Salmon', '1 fillet', 2.50), ing('Rice', '100 g', 0.20), ing('Soy sauce', '1 tbsp', 0.90),
        ing('Cucumber', '½', 0.60), ing('Salad', '1 handful', 1.00)],
      steps: ['Bake the salmon at 200°C for 12 minutes, then flake it.', 'Mash the salmon into warm rice with the soy sauce.',
        'Top with sliced cucumber and salad leaves.'],
      timeMinutes: 20, servings: 1
    },
    {
      id: 'r-x-2', title: 'Garlic mushroom toast', emoji: '🍄', color: '#EADBC8', sourcePlatform: 'Instagram',
      ingredients: [ing('Mushrooms', '150 g', 0.90), ing('Garlic', '1 clove', 0.15), ing('Bread', '2 slices', 1.00),
        ing('Olive oil', '1 tbsp', 0.15), ing('Black pepper', 'to taste', 0)],
      steps: ['Fry the sliced mushrooms in the oil until golden.', 'Add the crushed garlic for 1 minute and season.',
        'Pile onto hot toast.'],
      timeMinutes: 10, servings: 1
    },
    {
      id: 'r-x-3', title: 'Strawberry yoghurt pots', emoji: '🍓', color: '#FADADD', sourcePlatform: 'Instagram',
      ingredients: [ing('Yoghurt', '250 g', 1.20), ing('Strawberries', '150 g', 2.00), ing('Bananas', '1', 0.20),
        ing('Honey', '1 tbsp', 1.20)],
      steps: ['Slice the strawberries and banana.', 'Layer with the yoghurt in two glasses.', 'Drizzle with honey and chill.'],
      timeMinutes: 5, servings: 2
    }
  ];
})(window.Penny);
