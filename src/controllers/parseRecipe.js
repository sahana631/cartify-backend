const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const parseRecipe = async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from the following text and return ONLY a JSON object with these fields:
- title (string): recipe name
- description (string): one short sentence describing the dish
- time (string): total cook/prep time, e.g. "30 min" or "1 hr 15 min"
- servings (number): number of servings
- ingredients (array of strings): each ingredient with its quantity, e.g. "2 cups jasmine rice"

Return only valid JSON, no markdown, no explanation.

Recipe text:
${text}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);

  if (!parsed.title || !Array.isArray(parsed.ingredients)) {
    return res.status(422).json({ error: 'Could not parse recipe from that text' });
  }

  res.json(parsed);
};

module.exports = { parseRecipe };
