/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
    serverComponentsHmrCache: false,
    serverActions: {
      bodySizeLimit: "10mb", // ✅ ADD THIS
    },
  },

    images:{
        remotePatterns:[
            {
                protocol:"https",
                hostname:"zexxutiuedzcnqzpstuo.supabase.co",
            }
        ]
    }
};

export default nextConfig;
