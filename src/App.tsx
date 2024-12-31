import BackGroundImage from "./assets/bg.png";
import "./App.css";
import InputContainer from "./components/InputContainer";
import Bookmarks from "./components/Bookmarks";
import Cookies from "./utils/cookies";

function App() {
  Cookies.set("moss_guide_bookmarks", [
    { label: "百度", link: "https://www.baidu.com" },
    { label: "Google", link: "https://google.com" },
    { label: "Npm", link: "https://npmjs.com" },
  ]);
  return (
    <>
      <div className="main-box">
        <img className="bg-image" src={BackGroundImage} alt="background" />
        <InputContainer />
        <Bookmarks />
      </div>
    </>
  );
}

export default App;
