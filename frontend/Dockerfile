FROM node:20-alpine

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (CI 환경에서는 npm ci가 더 빠르고 안정적)
RUN npm ci || npm install

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 3432

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host"]