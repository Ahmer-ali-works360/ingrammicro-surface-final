// import Image from "next/image";
// import Link from "next/link";

// export default function Banner() {
//   return (
//     <div className="relative w-full overflow-hidden">
//       {/* Using grid for perfect centering */}
//       <div className="relative grid min-h-[calc(40vh+64px)] lg:min-h-[calc(66vh+54px)] place-items-center sm:m-0 m-2">
//         {/* Background image */}
//         <div
//           className="absolute inset-0 bg-cover bg-center bg-no-repeat"
//           style={{
//             backgroundImage: "url('/banner.png')",
//           }}
//         />

//         {/* Dark overlay */}
//         <div className="absolute inset-0 bg-black/30"></div>

//         {/* Content - Using grid for centering */}
//         <div className="relative z-10 w-full">
//           <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
//             <div className="mx-auto max-w-2xl lg:mx-0">

//               {/* Title */}
//               <h1 className="mb-4 text-center text-xl font-bold text-white sm:text-3xl md:text-left md:text-4xl lg:text-4xl">
//                 TD SYNNEX SURFACE DEMOS
//               </h1>

//               {/* Paragraph */}
//               <p className="mb-6 text-center sm:w-120 text-sm text-gray-100 sm:text-base md:text-left md:text-lg lg:mb-8 lg:text-base lg:leading-7 font-sans">
//                 Together with TD SYNNEX, the Microsoft team has created an exclusive Demo Program that gives customers the ability to customize, compare, and evaluate the most cutting-edge Surface devices in just a few simple steps!
//               </p>

//               {/* Logo */}
//               <div className="mb-6 flex justify-center md:justify-start lg:mb-8">
//                 <Image
//                   src="/collab.png"
//                   alt="TD SYNNEX and Microsoft Collaboration"
//                   width={300}
//                   height={90}
//                   className="h-auto sm:w-[300px] w-[250px]"
//                   priority
//                 />
//               </div>

//               {/* Button */}
//               <div className="flex justify-center md:justify-start">
//                 <Link
//                   href="/product-category/alldevices"
//                   className="inline-flex items-center justify-center rounded bg-[#f7b500] hover:bg-[#f1be31] px-5 py-2 text-sm font-semibold text-black focus:outline-none focus:ring-4 focus:ring-[#f7b500]/50 sm:px-6 sm:py-3 sm:text-base md:px-7 md:py-3 md:text-base"
//                 >
//                   Create Demo Kit
//                 </Link>
//               </div>

//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



// components/Hero.tsx

export default function Hero() {
    return (
        <section className="relative w-full">

            {/* ─── MOBILE LAYOUT (block, flex-col) ─── */}
            {/* ─── DESKTOP LAYOUT (background image, min-h) ─── */}

            {/* === MOBILE: Top Banner Image (sirf mobile pe dikhega) === */}
            <div className="block md:hidden w-full">
                <img
                    src="/Ingram-Banner-2-1.png"
                    alt="Ingram Banner"
                    className="w-full h-[220px] object-cover object-right"
                />
            </div>

            {/* === MAIN SECTION: Desktop pe background, Mobile pe plain === */}
            <div
                className="
                    relative
                    w-full
                    md:min-h-[600px]
                    lg:min-h-[700px]
                    md:bg-cover
                    md:bg-no-repeat
                    md:bg-right
                    
                "
                style={{
                    backgroundImage: "url('/Ingram-Banner-2-1.png')",
                }}
            >
                {/* Desktop pe background image hai, mobile pe white background */}
                <div className="max-w-7xl mx-auto px-6 py-10 md:py-0 md:h-[600px] lg:h-[700px] md:flex md:items-center">
                    <div className="max-w-2xl text-center md:text-left">

                        {/* H1 - Heading */}
                        <h1 className="
                            font-[var(--font-inter)]
                            font-semibold
                            uppercase
                            text-[#5C5C5C]
                            text-[22px] leading-[30px]
                            sm:text-[22px] sm:leading-[30px]
                            md:text-[44px] md:leading-[44px]
                            lg:text-[48px] lg:leading-[48px]
                            mb-4
                        ">
                            Ingram Micro and <br /> Microsoft Surface
                        </h1>

                        {/* Paragraph - Description */}
                        <p className="
                            text-gray-600
                            mb-6
                            text-sm leading-6
                            sm:text-sm sm:leading-6
                            md:text-lg md:leading-8
                        ">
                            Your Ingram Micro and Microsoft Surface team has created an exclusive
                            demo program that gives resellers the ability to customize, compare
                            and evaluate the most cutting-edge Surface devices in a few simple steps.
                        </p>

                        {/* Logo Image - Mobile pe beech mein, Desktop pe bhi yahan */}
                        <div className="flex items-center gap-6 mb-6 justify-center md:justify-start">
                            <img
                                src="/Logos-ingram.png"
                                alt="Ingram Micro Logo"
                                className="h-10 w-auto"
                            />
                        </div>

                        {/* CTA Button */}
                        <div className="flex justify-center md:justify-start">
                        <a
                            href="/create-demo-kit"
                           className="
        inline-flex
        items-center
        justify-center
        font-medium
        text-[15px]
        leading-[15px]
        text-white
        bg-[#1D76BC]
        px-6 py-3
        sm:px-6 sm:py-3
        md:px-10 md:py-5
        rounded-md
        transition
    "
                        >
                            Create Demo Kit
                        </a>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}