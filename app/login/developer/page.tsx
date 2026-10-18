import { redirect } from "next/navigation";

/** Old public path — send to role chooser so it no longer advertises team sign-in. */
export default function LegacyDeveloperLoginRedirect() {
  redirect("/login");
}
