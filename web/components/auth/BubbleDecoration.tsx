const BubbleDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large bubbles - より濃い色で視認性向上 */}
    <div
      className="absolute top-16 right-8 w-12 h-12 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#FADADD80",
        borderColor: "#FADADD",
        animationDelay: "0s",
        animationDuration: "3s",
      }}
    />
    <div
      className="absolute top-32 left-12 w-6 h-6 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#CFE8F780",
        borderColor: "#CFE8F7",
        animationDelay: "1s",
        animationDuration: "2.5s",
      }}
    />
    <div
      className="absolute top-24 right-20 w-4 h-4 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#FFF4C280",
        borderColor: "#FFF4C2",
        animationDelay: "0.5s",
        animationDuration: "2s",
      }}
    />

    {/* Medium bubbles - より濃い色で視認性向上 */}
    <div
      className="absolute top-48 left-8 w-8 h-8 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#CFE8F770",
        borderColor: "#CFE8F7",
        animationDelay: "1.5s",
        animationDuration: "3.5s",
      }}
    />
    <div
      className="absolute top-40 right-32 w-5 h-5 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#FADADD75",
        borderColor: "#FADADD",
        animationDelay: "2s",
        animationDuration: "2.8s",
      }}
    />

    {/* Small bubbles - より濃い色で視認性向上 */}
    <div
      className="absolute top-20 left-24 w-3 h-3 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#FFF4C285",
        borderColor: "#FFF4C2",
        animationDelay: "0.8s",
        animationDuration: "2.2s",
      }}
    />
    <div
      className="absolute top-36 right-16 w-2 h-2 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#FADADD90",
        borderColor: "#FADADD",
        animationDelay: "1.2s",
        animationDuration: "1.8s",
      }}
    />
    <div
      className="absolute top-52 left-20 w-3 h-3 rounded-full animate-pulse border"
      style={{
        backgroundColor: "#CFE8F775",
        borderColor: "#CFE8F7",
        animationDelay: "2.5s",
        animationDuration: "3.2s",
      }}
    />

    {/* Floating animation bubbles - より濃い色 */}
    <div
      className="absolute bottom-40 left-4 w-7 h-7 rounded-full border"
      style={{
        backgroundColor: "#FADADD60",
        borderColor: "#FADADD",
        animation: "float 4s ease-in-out infinite",
        animationDelay: "0s",
      }}
    />
    <div
      className="absolute bottom-32 right-6 w-5 h-5 rounded-full border"
      style={{
        backgroundColor: "#CFE8F770",
        borderColor: "#CFE8F7",
        animation: "float 3s ease-in-out infinite",
        animationDelay: "1s",
      }}
    />
    <div
      className="absolute bottom-48 right-24 w-4 h-4 rounded-full border"
      style={{
        backgroundColor: "#FFF4C280",
        borderColor: "#FFF4C2",
        animation: "float 3.5s ease-in-out infinite",
        animationDelay: "0.5s",
      }}
    />

    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `}</style>
  </div>
)

export default BubbleDecoration
