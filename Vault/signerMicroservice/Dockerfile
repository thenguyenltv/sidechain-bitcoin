FROM golang:1.21.4-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
RUN go build -o kms

EXPOSE 8080

CMD ["./kms"]

