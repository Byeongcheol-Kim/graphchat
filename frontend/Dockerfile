FROM node:20-alpine

WORKDIR /app

# package.json 복사
COPY package.json ./

# 의존성 설치 (npm install 사용)
RUN npm install

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host"]