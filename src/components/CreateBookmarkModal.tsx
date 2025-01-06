import { useEffect, useState } from "react";
import X from "../assets/x.svg";
import { Bookmark } from "../types";
import { createPortal } from "react-dom";

interface Props {
  show: boolean;
  defaultBookmark?: Bookmark;
  onClose: () => void;
  onChange: (action: "add" | "edit" | "remove", bookmark: Bookmark) => void;
}
const BookmarkModal: React.FC<Props> = ({
  show,
  defaultBookmark,
  onClose,
  onChange,
}) => {
  const [bookmark, setBookmark] = useState<Bookmark>({
    id: "",
    label: "",
    iconUrl: "",
    url: "",
  });

  /**
   * 提交新书签
   * @param event
   */
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (bookmark.label && bookmark.url) {
      const res = bookmark;
      if (!defaultBookmark) {
        res.id = Date.now().toString();
      }
      onChange(defaultBookmark ? "edit" : "add", res);
      onClose();
    }
  };

  const handleRemove: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    onChange("remove", bookmark);
    onClose();
  };

  useEffect(() => {
    if (show) {
      setBookmark(
        defaultBookmark || {
          id: "",
          label: "",
          iconUrl: "",
          url: "",
        }
      );
    }
  }, [show, defaultBookmark]);
  const renderContent = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white w-full rounded-lg max-w-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-xl font-medium">
              {defaultBookmark ? "Edit Bookmark" : "Create New Bookmark"}
            </div>
            <img className="cursor-pointer w-6 h-6" src={X} onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={bookmark.label}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    setBookmark({
                      ...bookmark,
                      label: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label>URL</label>
                <input
                  type="url"
                  value={bookmark.url}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    setBookmark({
                      ...bookmark,
                      url: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label>Icon URL</label>
                <input
                  type="url"
                  value={bookmark.iconUrl}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  onChange={(e) =>
                    setBookmark({
                      ...bookmark,
                      iconUrl: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            {defaultBookmark ? (
              <div className="w-full grid grid-cols-2 gap-4">
                <button
                  className="py-2 px-4 mt-6 bg-red-500 focus:bg-red-600 text-white border rounded-md transition-colors"
                  onClick={handleRemove}
                >
                  Remove
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 mt-6 bg-blue-500 focus:bg-blue-600 text-white border rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2 px-4 mt-6 bg-blue-500 text-white border rounded-md transition-colors"
              >
                Add
              </button>
            )}
          </form>
        </div>
      </div>
    );
  };
  const wrapper = () => {
    return <div className="modal-wrapper">{show && renderContent()}</div>;
  };
  return createPortal(wrapper(), document.body);
};

export default BookmarkModal;
