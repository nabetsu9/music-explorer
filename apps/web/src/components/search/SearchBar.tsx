import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Artist, api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface SearchBarProps {
  onSelect: (artist: Artist) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: () => api.search(searchTerm),
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = () => {
    setSearchTerm(query);
  };

  const handleSelect = (artist: Artist) => {
    onSelect(artist);
    setQuery("");
    setSearchTerm("");
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex gap-2">
        <Input
          placeholder="アーティスト名を検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isLoading || query.length < 2}>
          {isLoading ? "検索中..." : "検索"}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="mt-2 border rounded-md divide-y bg-white shadow-lg max-h-64 overflow-y-auto">
          {results.map((artist) => (
            <li
              key={artist.id}
              className="p-3 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => handleSelect(artist)}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(artist)}
            >
              <span className="font-medium">{artist.name}</span>
              {artist.country && (
                <span className="text-sm text-gray-500 ml-2">({artist.country})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
