import { EntityId } from '../todo/entity-id.vo.js';

type UserParams = {
  id: EntityId;
  name: string;
  email: string;
  password: string;
};

export class User {
  private readonly id: EntityId;
  private readonly name: string;
  private readonly email: string;
  private readonly password: string;
  private constructor({ id, name, email, password }: UserParams) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
  }

  public static create({
    name,
    email,
    password,
  }: Omit<UserParams, 'id'>): User {
    return new User({
      id: EntityId.generate(),
      name,
      email,
      password,
    });
  }

  public static reconstruct({ id, name, email, password }: UserParams): User {
    return new User({
      id: EntityId.reconstruct({ entityId: id.getEntityId() }),
      name,
      email,
      password,
    });
  }

  public update({ name, email, password }: Omit<UserParams, 'id'>): User {
    return new User({
      id: this.id,
      name,
      email,
      password,
    });
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPassword(): string {
    return this.password;
  }

  getId(): EntityId {
    return this.id;
  }
}
