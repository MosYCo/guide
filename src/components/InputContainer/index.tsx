import { useEffect, useState } from "react";
import GoogleSvg from "@/assets/google.svg";
import BaiduSvg from "@/assets/baidu.svg";
import SearchSvg from "@/assets/search.svg";
import "./index.css";
import Cookies from "@/utils/cookies";

const SearchEngine = {
  baidu: {
    icon: BaiduSvg,
    link: (value: string) => {
      return `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=baidu&wd=${encodeURIComponent(
        value
      )}`;
    },
  },
  google: {
    icon: GoogleSvg,
    link: (value: string) => {
      const v = encodeURIComponent(value);
      return `https://www.google.com/search?q=${v}&oq=${v}&sourceid=chrome&ie=UTF-8`;
    },
  },
} as const;

type SearchEngineTypes = keyof typeof SearchEngine;

const InputContainer: React.FC = () => {
  const [value, setValue] = useState("");

  const [engine, setEngine] = useState<SearchEngineTypes>("baidu");

  const search = () => {
    if (value) {
      window.open(SearchEngine[engine].link(value), "_blank");
    }
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setValue(e.target.value);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.code !== "Enter") {
      return;
    }
    search();
  };

  useEffect(() => {
    setEngine(
      (Cookies.get("moss_guide_engine") as SearchEngineTypes) || "baidu"
    );
  }, []);

  return (
    <div className="input-container">
      <input value={value} onChange={onChange} onKeyDown={onKeyDown} />
      <img
        className="engine-icon"
        src={SearchEngine[engine].icon}
        alt={engine}
      />
      <img
        className="search-icon"
        src={SearchSvg}
        alt="search"
        onClick={search}
      />
    </div>
  );
};

export default InputContainer;
