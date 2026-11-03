export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}
