-- CreateTable
CREATE TABLE "_BusinessUnitToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessUnitToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BusinessUnitToUser_B_index" ON "_BusinessUnitToUser"("B");

-- AddForeignKey
ALTER TABLE "_BusinessUnitToUser" ADD CONSTRAINT "_BusinessUnitToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "BusinessUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessUnitToUser" ADD CONSTRAINT "_BusinessUnitToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
