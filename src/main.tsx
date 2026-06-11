import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/AppProviders";
import { initLogging } from "./app/initLogging";
import { routes } from './routers'
import { Toaster } from "sonner";
import IconSuccess from "./app/icons/success";
import IconError from "./app/icons/IconError";
import Exit from "./app/components/Exit";
import { getCurrentWindow } from "@tauri-apps/api/window";

import "./style.css";

initLogging();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
    <AppProviders>
      <RouterProvider router={routes} />

      <Toaster
        expand={true}
        duration={5000}
        offset={{
          right: '20px',
          bottom: '20px',
        }}
        icons={{
          success: <IconSuccess style={{width: '24px', height: '24px'}} />,
          error: <IconError style={{width: '24px', height: '24px'}} />,
        }}
        toastOptions={{
          style: {
            width: "340px",
            border: 0,
            borderRadius: "12px",
            gap: "10px",
            paddingLeft: "16px",
            paddingTop: "16px",
            paddingBottom: "16px",
            paddingRight: "16px",
            fontSize: '17px',
            fontWeight: 'normal'
          },
        }}
      />

      <Exit />
    </AppProviders>
  // </React.StrictMode>
);


getCurrentWindow().onCloseRequested((event) => {
  event.preventDefault();
  globalThis.dispatchEvent(new CustomEvent('@app-close-requested'));
});
