import twVite from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  app: {
    head: {
      title: "AI48Hub",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#18181b" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" }
      ]
    }
  },

  css: ["@/assets/main.css"],

  devtools: { enabled: true },

  modules: ["@pinia/nuxt", "@nuxt/ui"],

  // Brand display face for headings and figures; bundled locally by @nuxt/fonts.
  fonts: {
    families: [{ name: "Plus Jakarta Sans", weights: [500, 600, 700, 800] }],
  },

  runtimeConfig: {
    public: {
      apiUrl: "",
      secretKey: "",
    },
  },

  routeRules: {
    "/": { redirect: "/app/login" },
  },

  vite: {
    plugins: [twVite()],
    optimizeDeps: {
      include: ["@vue/devtools-core", "@vue/devtools-kit"],
    },
  },

  // Nuxt 4.4.4 ssr:false requires the Vite environment API so the
  // vite-node IPC socket is configured before Nitro starts rendering.
  experimental: {
    viteEnvironmentApi: true,
    viewTransition: false,
  },

  compatibilityDate: "2026-05-05",
});
