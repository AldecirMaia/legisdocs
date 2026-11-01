import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que o frontend comunique com o backend sem bloqueios de CORS
  app.enableCors();

  // Aumenta o limite do Payload para aceitar imagens pesadas em Base64
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Se a Render fornecer uma porta, usa-a. Caso contrário, usa a 4000 localmente.
  // O '0.0.0.0' é obrigatório na Render para que os WebSockets sejam expostos à internet.
  await app.listen(process.env.PORT || 4000, '0.0.0.0');
}
bootstrap();