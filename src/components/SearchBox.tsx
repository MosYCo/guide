import { useEffect, useState } from "react";
import SearchSVG from "../assets/search.svg";
import GoogleSVG from "../assets/google.svg";
import BaiduSVG from "../assets/baidu.svg";
import { SearchEngine } from "../types";
import Cookies from "../utils/cookies";
import { SEARCH_ENGINE_KEY } from "../const";

const searchEngines: SearchEngine[] = [
  {
    name: "Baidu",
    icon: BaiduSVG,
    searchUrl: (query: string) => {
      return `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=baidu&wd=${query}`;
    },
  },
  {
    name: "Google",
    icon: GoogleSVG,
    searchUrl: (query: string) => {
      return `https://www.google.com/search?q=${query}&oq=${query}&sourceid=chrome&ie=UTF-8`;
    },
  },
];

const SearchBox: React.FC = () => {
  const [query, setQuery] = useState("");

  const [currentEngine, setCurrentEngine] = useState(searchEngines[0]);

  const handleSearch = () => {
    if (query) {
      window.open(currentEngine.searchUrl(query), "_blank");
    }
  };

  const toggleEngine = () => {
    const index = searchEngines.findIndex((i) => i.name === currentEngine.name);
    const newIndex = index >= searchEngines.length - 1 ? 0 : index + 1;
    setCurrentEngine(searchEngines[newIndex]);
    Cookies.set(SEARCH_ENGINE_KEY, searchEngines[newIndex].name, {
      expires: 300,
      path: '/guide'
    });
  };

  useEffect(() => {
    const engineKey = Cookies.get(SEARCH_ENGINE_KEY);
    if (engineKey) {
      const engine = searchEngines.find((i) => i.name === engineKey);
      if (engine) {
        setCurrentEngine(engine);
      }
    }
  }, []);
  return (
    <div className="relative w-full max-w-2xl">
      <button className="absolute left-4 top-1/2 -translate-y-1/2">
        <img src={currentEngine.icon} onClick={toggleEngine} />
      </button>
      <input
        className="w-full pl-16 pr-12 py-4 rounded-full border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-center"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        onKeyDown={(e) => {
          if (e.code === "Enter") {
            handleSearch();
          }
        }}
      />
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        onClick={handleSearch}
      >
        <img src={SearchSVG} />
      </button>
    </div>
  );
};

export default SearchBox;
