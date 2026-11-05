"use server";

import emailjs, { EmailJSResponseStatus } from "@emailjs/nodejs";

export async function sendEmailAction(data: any) {
  const {
    EMAILJS_PRIVATEKEY,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
  } = process.env;

  if (
    !EMAILJS_PRIVATEKEY ||
    !EMAILJS_PUBLIC_KEY ||
    !EMAILJS_SERVICE_ID ||
    !EMAILJS_TEMPLATE_ID
  ) {
    throw new Error("Missing EmailJS environment variables");
  }

  try {
    const TEMPLATE_PARAMS = {
      subject: data.subject,
      full_name: data.full_name,
      email: data.email,
      message: data.message,
    };
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      TEMPLATE_PARAMS,
      {
        publicKey: EMAILJS_PUBLIC_KEY,
        privateKey: EMAILJS_PRIVATEKEY,
      },
    );

    return { success: true };
  } catch (error) {
    if (error instanceof EmailJSResponseStatus) {
      console.log("EMAILJS FAILED...", error);
      return;
    }
    console.log("ERROR", error);
    return { success: false };
  }
}
