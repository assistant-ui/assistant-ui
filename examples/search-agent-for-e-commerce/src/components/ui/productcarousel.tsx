"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Product {
  thumbnail: string;
  title: string;
  description: string;
  metadata_3: string;
  link: string;
}

interface ProductCarouselProps {
  products: Product[];
}

const productStyle = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  textAlign: "center" as const,
};

const imageContainerStyle = {
  justifyContent: "center",
  maxWidth: "100%",
  overflow: "hidden",
};

const productLinkStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  maxWidth: "100%",
  height: "100%",
};

const productNameStyle = {
  marginTop: "0.5rem",
};

const productPriceStyle = {
  marginTop: "0.5rem",
};

export function CarouselPlugin({ products }: ProductCarouselProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true }),
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="relative w-full max-w-2xl"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent className="w-full">
        {products.map((product, index) => (
          <CarouselItem key={index} className="basis-1/2">
            <div className="relative w-full p-1">
              <Card className="h-full w-full">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <div className="product" style={productStyle}>
                    <div
                      className="image-container"
                      style={imageContainerStyle}
                    >
                      <a
                        className="product-link product_image"
                        href={product.link}
                        style={productLinkStyle}
                        data-mpn={product.metadata_3}
                        data-query={product.title}
                        data-intent="product_search"
                        data-order={index}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="img-fluid mb-3"
                          src={product.thumbnail}
                          alt={product.title}
                          style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                      </a>
                      <div className="productName" style={productNameStyle}>
                        <a
                          className="product-name-link"
                          href={product.link}
                          data-mpn={product.metadata_3}
                        >
                          {product.title}
                        </a>
                      </div>
                      <p>
                        <span
                          className="productPrice"
                          style={productPriceStyle}
                          dangerouslySetInnerHTML={{
                            __html: product.metadata_3,
                          }}
                        />
                      </p>
                      {/* <div className="actionGroup" style={actionGroupStyle}>
                        <a
                          className="chat_buy_now"
                          href={product.link}
                          data-mpn={product.metadata_3}
                        >
                          Buy Now
                        </a>
                      </div>
                      <div
                        className="see_more_products"
                        style={seeMoreProductsStyle}
                        data-mpn={product.metadata_3}
                        data-image={product.thumbnail}
                        data-title={product.title}
                      >
                        See more like this
                      </div> */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-2 top-1/2 z-10 -translate-y-1/2 transform" />
      <CarouselNext className="absolute right-2 top-1/2 z-10 -translate-y-1/2 transform" />
    </Carousel>
  );
}
