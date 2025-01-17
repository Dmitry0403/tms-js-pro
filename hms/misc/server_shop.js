import { createServer, Model, belongsTo, Factory, Response } from "miragejs"
import faker from 'faker';
import * as yup from 'yup';

const prodcutSchema = yup.object().shape({
  categoryTypeId: yup.string().required(),
  description: yup.string().required(),
  id: yup.string().required(),
  img: yup.string().required(),
  label: yup.string().required(),
  price: yup.string().required(),
});

const valdiateProduct = async (prodcut) => {
  return prodcutSchema
    .validate(prodcut, { abortEarly: false })
    .then(() => [])
    .catch(({ inner }) => inner.map((e) => e.message?.split(' at createError')[0] ?? e))
}

createServer({
  models: {
    category: Model,

    good: Model.extend({
      categoryType: belongsTo('category'),
    }),

    cart: Model,
  },

  factories: {
    good: Factory.extend({
      label: () => faker.commerce.productName(),
      price:  () => faker.commerce.price(1, 200),
      description:  () => faker.commerce.productDescription(),
      img: 'https://source.unsplash.com/random',
    }),
  },

  seeds(server) {
    const CATEGORIES = [
      { type: 'house', label: ' Дом, сад, зоотовары' },
      { type: 'children', label: 'Детям и мамам' },
      { type: 'cosmetics', label: 'Косметика, парфюмерия' },
      { type: 'souvenirs', label: 'Сувениры, галантерея' },
      { type: 'books', label: 'Книги' },
      { type: 'products', label: 'Продукты, деликатесы' },
      { type: 'entertainment', label: 'Развлечения, творчество' },
      { type: 'electronics', label: 'Техника, электроника' },
      { type: 'studies', label: 'Канцтовары, учёба' },
      { type: 'sport', label: 'Туризм, отдых, спорт' },
      { type: 'health', label: 'Здоровье, медтехника' },
    ];

    CATEGORIES.forEach((category) => {
      const serverCategory = server.create("category", category);

      server.createList("good", 20, { categoryTypeId: serverCategory.id });
    });
  },


  routes() {
    this.namespace = "api"

    this.get("/categories", (schema, request) => {
      const { ids } = request.queryParams;

      const idsArray = ids?.split(',');

      return schema.categories.where((category) => {
        return idsArray?.includes(category.id) ?? true
      });
    });

    this.get('/popular_categories', (schema) => {
      const categories = schema.categories.all().models;

      return categories.slice(0, 5).map((category) => {
        const items = schema.goods.where({ categoryTypeId: category.id }).models;

        return { category, items };
      });
    });

    this.get("/goods", (schema, request) => {
      const { ids, categoryTypeIds } = request.queryParams;

      const idsArray = ids?.split(',');
      const categoryTypeIdsArray = categoryTypeIds?.split(',');

      const items = schema.goods.where((good) => {
        const isIdMatch =  idsArray?.includes(good.id) ?? true
        const isTypeIdMatch =  categoryTypeIdsArray?.includes(good.categoryTypeId) ?? true

        return isIdMatch && isTypeIdMatch;
      });

      return {
        items: items.models,
        total: items.models.length,
      };
    });

    this.get('/cart', (schema) => {
      return schema.carts.all();
    });

    this.put('/cart', async (schema, request) => {
      try {
        const prodcut = JSON.parse(request.requestBody) ?? {};

        const errors = await valdiateProduct(prodcut);

        if (errors.length) {
          return new Response(400, {}, errors)
        };

        return schema.carts.findOrCreateBy(prodcut);
      } catch {
        return new Response(500)
      }
    }, { timing: 2000 });

    this.delete('/cart', async (schema, request) => {
      try {
        const prodcut = JSON.parse(request.requestBody) ?? {};

        const errors = await valdiateProduct(prodcut);

        if (errors.length) {
          return new Response(400, {}, errors)
        };

        const prodcutDb = schema.carts.findBy(prodcut);

        if (!prodcutDb) {
          return new Response(400, {}, 'Продукт не в корзине')
        }

        prodcutDb.destroy();

        return new Response(200);
      } catch {
        return new Response(500);
      }
    }, { timing: 2000 });
  },
})
