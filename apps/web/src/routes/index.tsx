import { Button } from "@/components/ui/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Music Explorer</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        アーティストの関連ネットワークを探索しよう
      </p>
      <Link to="/explore">
        <Button size="lg">探索を始める</Button>
      </Link>
    </div>
  );
}
