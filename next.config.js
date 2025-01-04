// const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  images: {
    domains: ['pbs.twimg.com','www.notion.so']
  },
  future: {
    webpack5: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
  
})
