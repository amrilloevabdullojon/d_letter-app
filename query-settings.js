const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } })
  console.log('Settings in DB:', settings)
}
main().finally(() => prisma.$disconnect())
