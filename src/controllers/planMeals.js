const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function isInPantry(ingredientStr, pantryNames) {
  const ing = ingredientStr.toLowerCase();
  for (const name of pantryNames) {
    const words = name.toLowerCase().split(/\s+/);
    if (words.every((w) => ing.includes(w))) return true;
  }
  return false;
}

const planMeals = async (req, res) => {
  const { description, recipes, pantryItems = [] } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return res.status(400).json({ error: 'recipes are required' });
  }

  const pantryNames = new Set(pantryItems.map((n) => n.toLowerCase()));
  const hasPantry = pantryNames.size > 0;

  const recipeList = recipes
    .map((r) => {
      const tags = r.tags?.length ? ` [${r.tags.join(', ')}]` : '';
      const desc = r.description ? ` — ${r.description}` : '';
      let pantryNote = '';
      if (hasPantry && Array.isArray(r.ingredients)) {
        const missing = r.ingredients.filter((ing) => !isInPantry(ing, pantryNames)).length;
        pantryNote = missing === 0 ? ' (pantry: have everything)' : ` (pantry: missing ${missing}/${r.ingredients.length} ingredients)`;
      }
      return `- ID ${r.id}: "${r.title}"${tags}${pantryNote}${desc}`;
    })
    .join('\n');

  const pantryContext = hasPantry
    ? `\nThe user's pantry contains: ${[...pantryNames].join(', ')}. Recipes marked "(pantry: have everything)" can be made without buying anything.`
    : '';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `The user is looking for meal ideas: "${description}"
${pantryContext}

Here are their saved recipes (with tags like cuisine, diet, or meal type in brackets):
${recipeList}

Match recipes based on what the user is asking for. Consider:
- Tags (e.g. [Italian], [Quick], [Vegetarian]) — prioritize these for category or style requests
- Recipe titles and descriptions for specific dish requests
- "Quick" or "fast" requests should favor recipes tagged Quick or with short cook times
- If the user asks about making something without buying anything, without going to the store, or with what they already have — return only recipes marked "(pantry: have everything)"

Return between 1 and 5 recipes that best fit the request. Only include genuinely good matches — if none fit, return an empty array.

Also, if the user mentioned a specific day of the week (e.g. "Monday", "for Tuesday"), extract it as a lowercase string. If no day was mentioned, use null.

Return ONLY a JSON object:
{ "recipeIds": [3, 7], "suggestedDay": "monday" }

No markdown, no explanation, only JSON.`,
      },
    ],
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.recipeIds)) {
    return res.status(422).json({ error: 'Could not match recipes' });
  }

  res.json({ recipeIds: parsed.recipeIds, suggestedDay: parsed.suggestedDay || null });
};

module.exports = { planMeals };
