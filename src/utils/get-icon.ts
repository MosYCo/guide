import axios from 'axios';

export const getIconPath = (url: string) => {
  axios.get(import.meta.env.VITE_GET_FAVICON_PATH + url).then(res => {
    console.log("%cMos Debug Console: ", "color: #F56C6C; font-weight: bold;", res);
  })
}