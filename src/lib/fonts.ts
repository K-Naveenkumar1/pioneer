import { Montserrat } from "next/font/google"

/**
 * Single shared Montserrat instance.
 * next/font deduplicates identical calls at build-time but sharing an explicit
 * instance avoids any potential double-load during development hot-reloads.
 */
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["700"] })
