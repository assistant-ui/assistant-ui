"use server";

export const submitSignup = async (data: object) => {
  const res = await fetch(process.env["ASSISTANT_UI_SUBMIT_SIGNUP_ENDPOINT"]!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
};
