import { redirect } from "next/navigation";

/** Public /wallet removed — wallet lives behind login at /account */
export default function WalletRedirect() {
  redirect("/account");
}
