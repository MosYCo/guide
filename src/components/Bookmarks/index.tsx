import { useEffect, useState } from "react";
import WebSvg from "@/assets/Web.svg";
import { BookmarksType } from "@/types/Bookmarks";
import Cookies from "@/utils/cookies";
import './index.css';

const Bookmarks: React.FC = () => {
  const [items, setItems] = useState<BookmarksType[]>([]);

  useEffect(() => {
    setItems(Cookies.get("moss_guide_bookmarks") as BookmarksType[]);
  }, [])

  const renderBookmarks = (item: BookmarksType) => {
    return (
      <div className="col" key={item.link}>
        <a className="bookmarks" href={item.link} target="_blank">
          <div className="icon">
            <img src={WebSvg} />
          </div>
          <div className="title">{item.label}</div>
        </a>
      </div>
    );
  };
  return (
    <div className="bm-container">
      <div className="row">{items.map((item) => renderBookmarks(item))}</div>
    </div>
  );
};

export default Bookmarks;
