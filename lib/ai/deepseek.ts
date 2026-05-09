type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function deepSeekEndpoint() {
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export async function callDeepSeekJson(messages: DeepSeekMessage[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(deepSeekEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices?.[0]?.message?.content ?? null;
}
