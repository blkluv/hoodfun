import { CreateForm } from "@/components/CreateForm";

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          Launch on Robinhood Chain
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Bonding curve → graduate to Uniswap. Paid creates to kill spam bots.
        </p>
      </div>
      <CreateForm />
    </div>
  );
}
