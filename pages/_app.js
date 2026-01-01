import { ThemeProvider } from "theme-ui";
import { SessionProvider } from "next-auth/react";
import theme from "../theme";
import "../styles/globals.css";
import Head from "next/head";

function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <link
          rel="icon"
          href="https://boba.hackclub.com/favicon.png"
          type="image/png"
          sizes="32x32"
        />
      </Head>
      <SessionProvider session={session}>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}

export default App;
