import Image from "next/image"

type Props = {}

const DasboardSnippet = (props: Props) => {
  return (
    <div className="relative pt-6 pb-10">
        <div className="w-full h-3/6 absolute rounded-[50%] radial--blur opacity-40 mx-10" />
        <div className="w-full aspect-video relative">
            <Image
                priority
                src="/dashboard-hero.png"
                className="opacity-[0.95] object-contain"
                alt="snippet"
                sizes="100vw"
                fill />
        </div>
    </div>
  )
}

export default DasboardSnippet