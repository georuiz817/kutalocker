import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password | kuraMart",
  description: "Reset your kuraMart password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
