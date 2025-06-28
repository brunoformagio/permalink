export const MainContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container-responsive pt-[100px]">
      {children}
    </div>
  );
};