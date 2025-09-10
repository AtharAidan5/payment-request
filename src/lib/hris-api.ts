const BaseURL = process.env.NEXT_PUBLIC_HRIS_API_URL;
const Token = process.env.NEXT_PUBLIC_HRIS_BARRIER_TOKEN;

export async function fetchEmployees() {
  if (!BaseURL || !Token) {
    throw new Error("Missing HRIS API configuration.");
  }

  const response = await fetch(`${BaseURL}/employee`, {
    headers: {
      Authorization: `Bearer ${Token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch employees.");
  }

  return response.json();
}