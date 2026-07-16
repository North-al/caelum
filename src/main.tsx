import ReactDOM from "react-dom/client";
import App from "./App";

import { setupStyles } from './styles'

setupStyles()


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App/>
    // <React.StrictMode>
    // </React.StrictMode>
)
