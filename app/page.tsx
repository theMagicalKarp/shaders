import ShaderCard, { ShaderCardProps } from "@/lib/components/ShaderCard";

export default function Page() {
  const cards: ShaderCardProps[] = [
    {
      title: { name: "Ray Marching", accent: "Lighting" },
      description:
        "Demonstrates ray marching with lighting which interacts with reflections and shadows.",
      link: "/shaders/ray-march/light",
    },
  ];

  return (
    <div className="container mx-auto mt-2 px-4 max-w-[50rem]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        <div className="col-span-1 lg:col-span-2">
          <h1 className={`text-4xl font-bold`}>
            Robert&lsquo;s <span className="text-secondary">Shaders</span>
          </h1>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <p>
            This is a collection of shaders that I have created. Each shader,
            when clicked, will take you to a dedicated page where you can view
            the shader in action, interact with it, and explore various settings
            to understand its visual effects and performance characteristics.
            This interactive showcase allows you to fully appreciate the
            intricacies and artistic value of each shader.
          </p>
        </div>
        {cards.map((card) => (
          <ShaderCard key={card.link} {...card} />
        ))}
      </div>
    </div>
  );
}
