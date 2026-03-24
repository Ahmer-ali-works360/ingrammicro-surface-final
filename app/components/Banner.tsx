// // import Image from "next/image";
// // import Link from "next/link";

// // export default function Banner() {
// //   return (
// //     <div className="relative w-full overflow-hidden">
// //       {/* Using grid for perfect centering */}
// //       <div className="relative grid min-h-[calc(40vh+64px)] lg:min-h-[calc(66vh+54px)] place-items-center sm:m-0 m-2">
// //         {/* Background image */}
// //         <div
// //           className="absolute inset-0 bg-cover bg-center bg-no-repeat"
// //           style={{
// //             backgroundImage: "url('/banner.png')",
// //           }}
// //         />

// //         {/* Dark overlay */}
// //         <div className="absolute inset-0 bg-black/30"></div>

// //         {/* Content - Using grid for centering */}
// //         <div className="relative z-10 w-full">
// //           <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
// //             <div className="mx-auto max-w-2xl lg:mx-0">

// //               {/* Title */}
// //               <h1 className="mb-4 text-center text-xl font-bold text-white sm:text-3xl md:text-left md:text-4xl lg:text-4xl">
// //                 TD SYNNEX SURFACE DEMOS
// //               </h1>

// //               {/* Paragraph */}
// //               <p className="mb-6 text-center sm:w-120 text-sm text-gray-100 sm:text-base md:text-left md:text-lg lg:mb-8 lg:text-base lg:leading-7 font-sans">
// //                 Together with TD SYNNEX, the Microsoft team has created an exclusive Demo Program that gives customers the ability to customize, compare, and evaluate the most cutting-edge Surface devices in just a few simple steps!
// //               </p>

// //               {/* Logo */}
// //               <div className="mb-6 flex justify-center md:justify-start lg:mb-8">
// //                 <Image
// //                   src="/collab.png"
// //                   alt="TD SYNNEX and Microsoft Collaboration"
// //                   width={300}
// //                   height={90}
// //                   className="h-auto sm:w-[300px] w-[250px]"
// //                   priority
// //                 />
// //               </div>

// //               {/* Button */}
// //               <div className="flex justify-center md:justify-start">
// //                 <Link
// //                   href="/product-category/alldevices"
// //                   className="inline-flex items-center justify-center rounded bg-[#f7b500] hover:bg-[#f1be31] px-5 py-2 text-sm font-semibold text-black focus:outline-none focus:ring-4 focus:ring-[#f7b500]/50 sm:px-6 sm:py-3 sm:text-base md:px-7 md:py-3 md:text-base"
// //                 >
// //                   Create Demo Kit
// //                 </Link>
// //               </div>

// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }



// // components/Hero.tsx

// export default function Hero() {
//     return (
//         <section className="relative w-full">

//             {/* ─── MOBILE LAYOUT (block, flex-col) ─── */}
//             {/* ─── DESKTOP LAYOUT (background image, min-h) ─── */}

//             {/* === MOBILE: Top Banner Image (sirf mobile pe dikhega) === */}
//             <div className="block md:hidden w-full">
//                 <img
//                     src="/Ingram-Banner-2-1.png"
//                     alt="Ingram Banner"
//                     className="w-full h-[220px] object-cover object-right"
//                 />
//             </div>

//             {/* === MAIN SECTION: Desktop pe background, Mobile pe plain === */}
//             <div
//                 className="
//                     relative
//                     w-full
//                     md:min-h-[600px]
//                     lg:min-h-[700px]
//                     md:bg-cover
//                     md:bg-no-repeat
//                     md:bg-right

//                 "
//                 style={{
//                     backgroundImage: "url('/Ingram-Banner-2-1.png')",
//                 }}
//             >
//                 {/* Desktop pe background image hai, mobile pe white background */}
//                 <div className="max-w-7xl mx-auto px-6 py-10 md:py-0 md:h-[600px] lg:h-[700px] md:flex md:items-center">
//                     <div className="max-w-2xl text-center md:text-left">

//                         {/* H1 - Heading */}
//                         <h1 className="
//                             font-[var(--font-inter)]
//                             font-semibold
//                             uppercase
//                             text-[#5C5C5C]
//                             text-[22px] leading-[30px]
//                             sm:text-[22px] sm:leading-[30px]
//                             md:text-[44px] md:leading-[44px]
//                             lg:text-[48px] lg:leading-[48px]
//                             mb-4
//                         ">
//                             Ingram Micro and <br /> Microsoft Surface
//                         </h1>

//                         {/* Paragraph - Description */}
//                         <p className="
//                             text-gray-600
//                             mb-6
//                             text-sm leading-6
//                             sm:text-sm sm:leading-6
//                             md:text-lg md:leading-8
//                         ">
//                             Your Ingram Micro and Microsoft Surface team has created an exclusive
//                             demo program that gives resellers the ability to customize, compare
//                             and evaluate the most cutting-edge Surface devices in a few simple steps.
//                         </p>

//                         {/* Logo Image - Mobile pe beech mein, Desktop pe bhi yahan */}
//                         <div className="flex items-center gap-6 mb-6 justify-center md:justify-start">
//                             <img
//                                 src="/Logos-ingram.png"
//                                 alt="Ingram Micro Logo"
//                                 className="h-10 w-auto"
//                             />
//                         </div>

//                         {/* CTA Button */}
//                         <div className="flex justify-center md:justify-start">
//                         <a
//                             href="/create-demo-kit"
//                            className="
//         inline-flex
//         items-center
//         justify-center
//         font-medium
//         text-[15px]
//         leading-[15px]
//         text-white
//         bg-[#1D76BC]
//         px-6 py-3
//         sm:px-6 sm:py-3
//         md:px-10 md:py-5
//         rounded-md
//         transition
//     "
//                         >
//                             Create Demo Kit
//                         </a>
//                         </div>

//                     </div>
//                 </div>
//             </div>
//         </section>
//     );
// }



// 


import Image from "next/image";
import Link from "next/link";

export default function Banner() {
  return (
    <div className="relative w-full overflow-hidden">

      {/* ── Background image (laptop + blue circles baked in) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ingram-banner-final.png')" }}
      />

      {/* ── Foreground content ── */}
      <div className="relative z-10 flex items-center w-full min-h-[200px] sm:min-h-[300px] md:min-h-[380px] lg:min-h-[440px] xl:min-h-[480px]">

        {/* Left column — mobile: center aligned | sm+: left aligned */}
        <div className="w-[90%] sm:w-[55%] md:w-[50%] lg:w-[56%] xl:w-[58%] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16 py-8 sm:py-10 md:py-12 lg:py-14 mx-auto sm:mx-0 text-center sm:text-left flex flex-col items-center sm:items-start">

          {/* ── Heading ── */}
          <h1
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: "clamp(28px, 3.5vw, 60px)",
              fontWeight: "600",
              lineHeight: "1.325",
              letterSpacing: "0",
              color: "#3d3d3d",
              marginBottom: "14px",
            }}
          >
            Ingram Micro and
            <br />
            Microsoft Surface
          </h1>

          {/* ── Body paragraph ── */}
          <p
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif", 
              fontSize: "clamp(14px, 1.8vw, 18px)",
              fontWeight: "400",
              lineHeight: "1.35",
              letterSpacing: "0.5",
              color: "#3d3d3d",
              marginBottom: "18px",
              maxWidth: "590px",
            }}
          >
            Your Ingram Micro and Microsoft Surface team has created an
            exclusive demo program that gives resellers the ability to
            customize, compare and evaluate the most cutting-edge Surface
            devices in a few simple steps.
          </p>

          {/* ── Logos ── */}
          <div className="mb-5 lg:mb-6">
            <Image
              src="/Logos-ingram.png"
              alt="Microsoft Surface and Ingram Micro Logos"
              width={350}
              height={45}
              className="h-auto w-[180px] sm:w-[210px] md:w-[240px] lg:w-[270px] xl:w-[300px]"
              priority
            />
          </div>

          {/* ── CTA Button ── */}
          <Link
            href="/product-category/alldevices"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1570EF",
              color: "#ffffff",
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: "18px",
              fontWeight: "600",
              letterSpacing: "0.2px",
              lineHeight: "1",
              padding: "16px 35px",
              borderRadius: "10px",
              textDecoration: "none",
              transition: "background-color 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1660a0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1570EF")}
          >
            Create Demo Kit
          </Link>

        </div>
      </div>
    </div>
  );
}