import { useEffect, useState } from "react";
import { Bookmark } from "../types";
import CreateBookmarkModal from "./CreateBookmarkModal";
import Cookies from "../utils/cookies";
import { BOOKMARK_KEY } from "../const";

const getDefaultIconUrl = (bookmark: Bookmark, size = 24) => {
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${bookmark.url}&size=${size}`;
};

const BookmarkList: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [currentBookmark, setCurrentBookmark] = useState<Bookmark>();
  const handleChange = (
    action: "add" | "edit" | "remove",
    bookmark: Bookmark
  ) => {
    let newRes: Bookmark[] = [];
    switch (action) {
      case "add":
        newRes = [...bookmarks, bookmark];
        break;
      case "edit":
        newRes = bookmarks.map((i) => (i.id === bookmark.id ? bookmark : i));
        break;
      case "remove":
        newRes = bookmarks.filter((i) => i.id !== bookmark.id);
        break;
    }
    setBookmarks(newRes);
    Cookies.set(BOOKMARK_KEY, newRes);
  };

  useEffect(() => {
    const marks = Cookies.get(BOOKMARK_KEY) as Bookmark[];
    if (marks && marks.length) {
      setBookmarks(marks);
    }
  }, []);
  return (
    <div className="relative w-full max-w-4xl">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {bookmarks.map((bookmark) => (
          <a
            key={bookmark.id}
            href={bookmark.url}
            className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group"
            onContextMenu={(e) => {
              e.preventDefault();
              setCurrentBookmark(bookmark);
              setShowOpen(true);
            }}
          >
            <div className="flex items-center space-x-3">
              <img
                src={bookmark.iconUrl || getDefaultIconUrl(bookmark)}
                alt=""
                className="w-6 h-6"
              />
              <span className="font-medium text-gray-700 group-hover:text-blue-500 transition-colors">
                {bookmark.label}
              </span>
            </div>
          </a>
        ))}
        <button
          className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center space-x-2"
          onClick={() => setShowOpen(true)}
        >
          <span className="text-gray-600">Add</span>
        </button>
      </div>
      <CreateBookmarkModal
        show={showOpen}
        defaultBookmark={currentBookmark}
        onClose={() => {
          setCurrentBookmark(undefined);
          setShowOpen(false);
        }}
        onChange={handleChange}
      />
    </div>
  );
};

export default BookmarkList;
