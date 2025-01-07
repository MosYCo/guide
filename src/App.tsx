import BookmarkList from "./components/BookmarkList";
import SearchBox from "./components/SearchBox";
import bg from "./assets/bg.png";

function App() {
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <img
          className="min-h-screen object-cover fixed top-0 left-0 scale-105 blur-sm"
          src={bg}
          alt=""
        />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="flex flex-col items-center space-y-32">
            <SearchBox />
            <BookmarkList />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
