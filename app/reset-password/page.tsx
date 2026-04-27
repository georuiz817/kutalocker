import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password | kuraMart",
  description: "Set a new kuraMart password",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
