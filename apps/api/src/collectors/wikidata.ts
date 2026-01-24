const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "MusicExplorer/1.0.0 (music-explorer@example.com)";

export interface WikidataArtist {
  wikidataId: string;
  imageUrl: string | null;
  genres: string[];
}

interface SparqlBinding {
  artist?: { value: string };
  image?: { value: string };
  genreLabel?: { value: string };
}

interface SparqlResponse {
  results: {
    bindings: SparqlBinding[];
  };
}

export async function fetchArtistByMBID(mbid: string): Promise<WikidataArtist | null> {
  const query = `
    SELECT ?artist ?image ?genreLabel WHERE {
      ?artist wdt:P434 "${mbid}" .
      OPTIONAL { ?artist wdt:P18 ?image . }
      OPTIONAL { ?artist wdt:P136 ?genre . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata API error: ${response.status}`);
  }

  const data = (await response.json()) as SparqlResponse;
  const bindings = data.results.bindings;

  if (bindings.length === 0) {
    return null;
  }

  const firstBinding = bindings[0];
  const wikidataId = firstBinding.artist?.value.split("/").pop() || "";
  const imageUrl = firstBinding.image?.value || null;

  const genres = [
    ...new Set(bindings.map((b) => b.genreLabel?.value).filter((g): g is string => Boolean(g))),
  ];

  return {
    wikidataId,
    imageUrl,
    genres,
  };
}
