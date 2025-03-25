// helper function to serialize car data
export const serializedCarData=(car,wishlisted=false)=>{
    return {
        ...car,
        price: car.price ? parseFloat(car.price.toString()) : 0,
        createdAt :car.createdAt?.toISOString(),
        updatedAt:car.updatedAt?.toISOString(),
        wishlisted : wishlisted,
    }
}

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(amount)
}
