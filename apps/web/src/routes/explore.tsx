import { NetworkGraph } from "@/components/graph/NetworkGraph";
import { SearchBar } from "@/components/search/SearchBar";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["graph", selectedArtistId],
    queryFn: () => api.getGraph(selectedArtistId!, 2),
    enabled: !!selectedArtistId,
  });

  const handleNodeClick = (nodeId: string) => {
    setSelectedArtistId(nodeId);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Music Explorer</h1>
        <Link to="/" className="text-blue-600 hover:underline">
          ホームに戻る
        </Link>
      </div>

      <SearchBar onSelect={(artist) => setSelectedArtistId(artist.id)} />

      <div className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">グラフを読み込み中...</p>
          </div>
        )}

        {graphData && graphData.nodes.length > 0 && (
          <NetworkGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
          />
        )}

        {!graphData && !isLoading && (
          <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">
              アーティストを検索して、関連ネットワークを探索しましょう
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
